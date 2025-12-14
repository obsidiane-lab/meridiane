import { sanitizeTypeName, quoteKeyIfNeeded } from './utils.js';
import { filterSchemaNames, applySchemaNameFilters, mergeAllOf, isObject, schemaNameFromRef } from './schema-utils.js';
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
    const sanitized = nameMap.get(originalName);
    if (!sanitized) continue;

    /** @type {string[]} */
    const extendsTypes = [];

    let effective = raw;
    if (raw?.allOf) {
      const merged = mergeAllOf(raw.allOf);
      if (merged) {
        effective = merged;
      } else {
        // Non-flattenable allOf (refs, mixed forms): keep inline object props and model refs as extends.
        const props = {};
        const required = new Set();
        const ext = new Set();

        for (const part of raw.allOf) {
          if (part?.$ref) {
            const orig = schemaNameFromRef(part.$ref);
            const refName = orig ? nameMap.get(orig) : undefined;
            if (refName && refName !== sanitized && allSanitizedNames.has(refName)) ext.add(refName);
            continue;
          }
          const isObj = part?.type === 'object' || isObject(part?.properties);
          if (!isObj) continue;
          Object.assign(props, part.properties || {});
          for (const r of part.required || []) required.add(r);
        }

        extendsTypes.push(...[...ext].sort((a, b) => a.localeCompare(b)));
        effective = { type: 'object', properties: props, required: [...required] };
      }
    }

    const isObjectLike = effective?.type === 'object' || isObject(effective?.properties) || extendsTypes.length > 0;
    if (!isObjectLike) continue;

    const required = new Set(effective.required || []);
    const deps = new Set();

    for (const e of extendsTypes) deps.add(e);

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

    models.push({name: sanitized, props, imports, extendsTypes});
  }

  return {models};
}
