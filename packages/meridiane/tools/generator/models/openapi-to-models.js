import { sanitizeTypeName, quoteKeyIfNeeded } from './utils.js';
import { filterSchemaNames, applySchemaNameFilters, mergeAllOf, isObject } from './schema-utils.js';
import { schemaLabel } from './naming.js';
import { tsTypeOf, withNullable } from './type-resolver.js';

/**
 * @typedef {{
 *   requiredMode?: 'all-optional'|'spec',
 *   preset?: 'all'|'native',
 *   includeSchemaNames?: Array<RegExp|string|((name: string) => boolean)>,
 *   excludeSchemaNames?: Array<RegExp|string|((name: string) => boolean)>,
 * }} BuildOptions
 */

/**
 * Construit une map originalName -> sanitizedName, en assurant l’unicité
 * @param {string[]} schemaNames
 */
function normalizeNativeBase(original) {
  return String(original)
    .replace(/\.jsonld\b/ig, '')
    .replace(/\.jsonapi\b/ig, '')
    .replace(/\.jsonmergepatch\b/ig, '')
    .split('-')[0];
}

function buildNameMap(schemaNames, schemas, preset) {
  // Build final map with uniqueness (deterministic order)
  const used = new Set();
  const nameMap = new Map();
  for (const original of schemaNames) {
    const label = schemaLabel(original, {preset});
    nameMap.set(original, sanitizeTypeName(label, used));
  }

  // In native mode, alias excluded variants to the selected base type
  // so `$ref` doesn't leak "User-user.write" etc into generated types.
  if (preset === 'native') {
    const baseToSanitized = new Map();
    for (const original of schemaNames) {
      baseToSanitized.set(normalizeNativeBase(original), nameMap.get(original));
    }
    for (const original of Object.keys(schemas)) {
      const base = normalizeNativeBase(original);
      const sanitized = baseToSanitized.get(base);
      if (sanitized) nameMap.set(original, sanitized);
    }
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
  const schemaNames = applySchemaNameFilters(filterSchemaNames(schemas, opts), opts);
  const preset = opts.preset ?? 'all';
  const nameMap = buildNameMap(schemaNames, schemas, preset);
  const allSanitizedNames = new Set([...nameMap.values()]);

  /** @type {ModelDefinition[]} */
  const models = [];

  for (const originalName of schemaNames) {
    const raw = schemas[originalName];
    let effective = raw;
    if (raw?.allOf) {
      const merged = mergeAllOf(raw.allOf);
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
