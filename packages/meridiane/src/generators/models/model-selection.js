import {expandWithSchemaDependencies} from './oas-contract.js';
import {
  baseTsNameFromBasePath,
  groupTsNameFromGroupPath,
  parseOpenApiSchemaName,
} from './oas-schema-name.js';
import {sanitizeTypeName} from './utils.js';

const HYDRA_SCHEMA = /^Hydra/i;

/** Representations of one resource, in emission order: the JSON-LD one is what the bridge reads. */
const VARIANT_ORDER = ['jsonld', 'none', 'multipart'];
const VARIANT_SUFFIX = {jsonld: 'JsonLd', none: 'Json', multipart: 'Multipart'};

function matchesRule(value, rule) {
  if (rule instanceof RegExp) return rule.test(value);
  if (typeof rule === 'function') return !!rule(value);
  return typeof rule === 'string' && rule.length > 0 && value.includes(rule);
}

function isSelected(schemaName, include, exclude) {
  const parsed = parseOpenApiSchemaName(schemaName);
  const canonicalName = parsed.groupPath ? `${parsed.basePath}-${parsed.groupPath}` : parsed.basePath;
  const names = [schemaName, canonicalName];
  const matchesAny = (rules) => rules.some((rule) =>
    names.some((name) => matchesRule(name, rule))
  );

  return (include.length === 0 || matchesAny(include)) && !matchesAny(exclude);
}

/** Hydra schemas are covered by the runtime `Item`/`Collection` types; merge-patch bodies by `Partial<T>`. */
function isModelSchema(schemaName) {
  return !HYDRA_SCHEMA.test(schemaName) && !parseOpenApiSchemaName(schemaName).isMergePatch;
}

function variantRank(schemaName) {
  const rank = VARIANT_ORDER.indexOf(parseOpenApiSchemaName(schemaName).baseVariant);
  return rank < 0 ? VARIANT_ORDER.length : rank;
}

/** Name shared by every representation of a resource (`Book`, `Book.jsonld`, `Book.multipart` → `Book`). */
export function resourceTypeName(schemaName) {
  const parsed = parseOpenApiSchemaName(schemaName);
  return `${baseTsNameFromBasePath(parsed.basePath)}${groupTsNameFromGroupPath(parsed.groupPath)}` || 'Model';
}

/** Selects the component schemas of the contract, optionally filtered by `include` / `exclude`. */
export function selectModelSchemas(spec, options = {}) {
  const schemas = spec?.components?.schemas ?? {};
  const include = Array.isArray(options.includeSchemaNames) ? options.includeSchemaNames : [];
  const exclude = Array.isArray(options.excludeSchemaNames) ? options.excludeSchemaNames : [];

  const selected = Object.keys(schemas)
    .filter(isModelSchema)
    .filter((schemaName) => isSelected(schemaName, include, exclude));
  const schemaNames = include.length > 0 || exclude.length > 0
    ? [...expandWithSchemaDependencies(selected, schemas)]
    : selected;

  return {
    schemas,
    schemaNames: schemaNames.filter(isModelSchema).sort((left, right) => left.localeCompare(right)),
  };
}

/**
 * Names the models: the representations of one resource that have the same TypeScript shape share one model,
 * named after the resource. A representation with a different shape gets its variant as suffix.
 *
 * @param {string[]} schemaNames
 * @param {Map<string, string>} signatures shape of each schema, computed with resource names
 * @returns {{typeNames: Map<string, string>, emitted: string[]}}
 */
export function assignTypeNames(schemaNames, signatures) {
  const representations = new Map();
  for (const schemaName of schemaNames) {
    const resourceName = resourceTypeName(schemaName);
    representations.set(resourceName, [...(representations.get(resourceName) ?? []), schemaName]);
  }

  const usedNames = new Set();
  const typeNames = new Map();
  const emitted = [];
  const sortedResources = [...representations.entries()].sort(([left], [right]) => left.localeCompare(right));

  for (const [resourceName, names] of sortedResources) {
    names.sort((left, right) => variantRank(left) - variantRank(right) || left.localeCompare(right));
    const typeNameBySignature = new Map();

    for (const schemaName of names) {
      const signature = signatures.get(schemaName);
      const sameShape = typeNameBySignature.get(signature);
      if (sameShape) {
        typeNames.set(schemaName, sameShape);
        continue;
      }

      const variant = parseOpenApiSchemaName(schemaName).baseVariant;
      const candidate = typeNameBySignature.size === 0 ? resourceName : `${resourceName}${VARIANT_SUFFIX[variant] ?? ''}`;
      const typeName = sanitizeTypeName(candidate, usedNames);
      typeNameBySignature.set(signature, typeName);
      typeNames.set(schemaName, typeName);
      emitted.push(schemaName);
    }
  }

  return {typeNames, emitted};
}
