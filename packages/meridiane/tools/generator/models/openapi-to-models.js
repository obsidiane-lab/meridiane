import { sanitizeTypeName, quoteKeyIfNeeded } from './utils.js';
import { filterSchemaNames, mergeAllOf, isObject } from './schema-utils.js';
import { friendlyName } from './naming.js';
import { tsTypeOf, withNullable } from './type-resolver.js';

/**
 * Construit une map originalName -> sanitizedName, en assurant l’unicité
 * @param {string[]} schemaNames
 */
function buildNameMap(schemaNames) {
  const parse = (original) => {
    const m = original.match(/^(.*?)(?:\.(?:jsonld|jsonapi))?-(.+)$/i);
    return m ? { base: m[1], group: m[2] } : { base: original, group: null };
  };

  const parsed = schemaNames.map((n) => ({ name: n, ...parse(n) }));
  const roots = parsed.filter((p) => !p.group);
  const grouped = parsed.filter((p) => !!p.group);

  // Root sanitized names (to avoid collisions when dropping group)
  const rootSanitized = new Set(roots.map((p) => sanitizeTypeName(p.base, new Set())));

  // Count base candidates among grouped to see if unique
  const baseCount = new Map();
  for (const p of grouped) {
    const cand = sanitizeTypeName(p.base, new Set());
    baseCount.set(cand, (baseCount.get(cand) || 0) + 1);
  }

  // Build final map with uniqueness
  const used = new Set();
  const nameMap = new Map();
  for (const p of parsed) {
    let label;
    if (p.group) {
      const cand = sanitizeTypeName(p.base, new Set());
      const isUniqueBase = (baseCount.get(cand) === 1) && !rootSanitized.has(cand);
      label = isUniqueBase ? p.base : friendlyName(p.name);
    } else {
      label = friendlyName(p.name);
    }
    nameMap.set(p.name, sanitizeTypeName(label, used));
  }
  return nameMap;
}

/**
 * Construit les définitions de modèles à partir d’une spec OpenAPI (components.schemas)
 * @param {any} spec
 * @param {BuildOptions} [options]
 * @returns {{ models: ModelDefinition[] }}
 */
export function buildModelsFromOpenAPI(spec, options) {
  const opts = { requiredMode: 'all-optional', ...(options || {}) };
  const schemas = spec?.components?.schemas || {};
  const schemaNames = filterSchemaNames(schemas, opts);
  const nameMap = buildNameMap(schemaNames);
  const allSanitizedNames = new Set([...nameMap.values()]);

  /** @type {ModelDefinition[]} */
  const models = [];

  for (const originalName of schemaNames) {
    const raw = schemas[originalName];
    let effective = raw;
    if (raw?.allOf) {
      const merged = mergeAllOf(raw.allOf, opts);
      if (merged) effective = merged;
    }

    const isObjectLike = effective?.type === 'object' || isObject(effective?.properties);
    if (!isObjectLike) continue;

    const sanitized = nameMap.get(originalName);
    const required = new Set(effective.required || []);
    const deps = new Set();

    const props = Object.entries(effective.properties || {}).map(([propName, prop]) => {
      const baseType = tsTypeOf(prop, deps, nameMap);
      const type = withNullable(baseType, prop);
      return {
        name: propName,
        tsKey: quoteKeyIfNeeded(propName),
        type,
        optional: opts.requiredMode === 'spec' ? !required.has(propName) : true,
      };
    });

    const imports = [...deps]
      .filter((n) => n !== sanitized)
      .filter((n) => allSanitizedNames.has(n))
      .sort((a, b) => a.localeCompare(b));

    models.push({name: sanitized, props, imports});
  }

  return {models};
}
