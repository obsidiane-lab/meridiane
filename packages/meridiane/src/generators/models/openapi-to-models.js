import {canonicalizeMediaType, collectUsedSchemasForMediaType, expandWithSchemaDependencies} from './oas-contract.js';
import {
  baseTsNameFromBasePath,
  formatSuffixToken,
  groupTsNameFromGroupPath,
  parseOpenApiSchemaName,
} from './oas-schema-name.js';
import {isObject, mergeAllOf, schemaNameFromRef} from './schema-utils.js';
import {tsTypeOf, withNullable} from './type-resolver.js';
import {quoteKeyIfNeeded, sanitizeTypeName} from './utils.js';

const DEFAULT_FORMAT = 'application/ld+json';

/**
 * @typedef {{
 *   requiredMode?: 'all'|'spec',
 *   formats?: string[],
 *   includeSchemaNames?: Array<RegExp|string|((name: string) => boolean)>,
 *   excludeSchemaNames?: Array<RegExp|string|((name: string) => boolean)>,
 * }} BuildOptions
 */

/** @typedef {{name: string, tsKey: string, type: string, optional: boolean}} ModelProp */

/**
 * @typedef {{
 *   name: string,
 *   props: ModelProp[],
 *   imports: string[],
 *   extendsTypes: string[],
 *   extendsItem?: boolean,
 * }} ModelDefinition
 */

function normalizeRequiredMode(value) {
  return String(value ?? '').trim().toLowerCase() === 'spec' ? 'spec' : 'all';
}

function normalizeFormats(values) {
  const formats = [];
  for (const value of Array.isArray(values) ? values : []) {
    const format = canonicalizeMediaType(value);
    if (format && !formats.includes(format)) formats.push(format);
  }
  return formats.length > 0 ? formats : [DEFAULT_FORMAT];
}

function indexFormatsBySchema(spec, formats) {
  const schemaToFormats = new Map();

  for (const format of formats) {
    const schemaNames = collectUsedSchemasForMediaType(spec, {mediaType: format});
    for (const schemaName of schemaNames) {
      if (!schemaName) continue;
      const schemaFormats = schemaToFormats.get(schemaName) ?? new Set();
      schemaFormats.add(format);
      schemaToFormats.set(schemaName, schemaFormats);
    }
  }

  return schemaToFormats;
}

function matchesRule(value, rule) {
  if (rule instanceof RegExp) return rule.test(value);
  if (typeof rule === 'function') return !!rule(value);
  return typeof rule === 'string' && rule.length > 0 && value.includes(rule);
}

function isSelectedSchema(schemaName, include, exclude) {
  const parsed = parseOpenApiSchemaName(schemaName);
  const canonicalName = parsed.groupPath ? `${parsed.basePath}-${parsed.groupPath}` : parsed.basePath;
  const names = [schemaName, canonicalName];
  const matchesAny = (rules) => rules.some((rule) => names.some((name) => matchesRule(name, rule)));

  return (include.length === 0 || matchesAny(include)) && !matchesAny(exclude);
}

function selectCandidateSchemas({schemas, schemaToFormats, include, exclude}) {
  const selected = [...schemaToFormats.keys()]
    .filter((name) => name && !/^Hydra/i.test(name))
    .sort((left, right) => left.localeCompare(right))
    .filter((name) => isSelectedSchema(name, include, exclude));

  const candidates = include.length > 0 || exclude.length > 0
    ? expandWithSchemaDependencies(selected, schemas)
    : new Set(selected);

  return [...candidates]
    .filter((name) => name && !/^Hydra/i.test(name))
    .sort((left, right) => left.localeCompare(right));
}

function choosePreferredFormats(candidates, formats, schemaToFormats) {
  const priority = new Map(formats.map((format, index) => [format, index]));
  const preferredBySchema = new Map();

  for (const schemaName of candidates) {
    const schemaFormats = [...(schemaToFormats.get(schemaName) ?? [])];
    const preferred = schemaFormats.sort(
      (left, right) => (priority.get(left) ?? 999) - (priority.get(right) ?? 999)
    )[0] ?? formats[0];
    preferredBySchema.set(schemaName, preferred);
  }

  return {preferredBySchema, priority};
}

function desiredTypeName(schemaName) {
  const parsed = parseOpenApiSchemaName(schemaName);
  if (parsed.isMergePatch) return undefined;

  const base = baseTsNameFromBasePath(parsed.basePath);
  const group = groupTsNameFromGroupPath(parsed.groupPath);
  return `${base}${group}` || 'Model';
}

function assignTypeNames(candidates, preferredBySchema, formatPriority) {
  const entriesByName = new Map();

  for (const schemaName of candidates) {
    const desired = desiredTypeName(schemaName);
    if (!desired) continue;

    const preferredFormat = preferredBySchema.get(schemaName);
    const entries = entriesByName.get(desired) ?? [];
    entries.push({schemaName, preferredFormat});
    entriesByName.set(desired, entries);
  }

  const usedNames = new Set();
  const typeNameBySchema = new Map();

  const sortedGroups = [...entriesByName.entries()].sort(([left], [right]) => left.localeCompare(right));
  for (const [desired, entries] of sortedGroups) {
    entries.sort((left, right) => {
      const byFormat =
        (formatPriority.get(left.preferredFormat) ?? 999) -
        (formatPriority.get(right.preferredFormat) ?? 999);
      return byFormat || left.schemaName.localeCompare(right.schemaName);
    });

    entries.forEach((entry, index) => {
      const candidateName = index === 0
        ? desired
        : `${desired}${formatSuffixToken(entry.preferredFormat)}`;
      typeNameBySchema.set(entry.schemaName, sanitizeTypeName(candidateName, usedNames));
    });
  }

  return typeNameBySchema;
}

function resolveObjectSchema(raw, currentTypeName, typeNameBySchema, knownTypeNames) {
  const extendsTypes = [];
  if (!raw?.allOf) return {schema: raw, extendsTypes};

  const merged = mergeAllOf(raw.allOf);
  if (merged) return {schema: merged, extendsTypes};

  const properties = {};
  const required = new Set();
  const inheritedTypes = new Set();

  for (const part of raw.allOf) {
    if (part?.$ref) {
      const referencedSchema = schemaNameFromRef(part.$ref);
      if (!referencedSchema || /^Hydra/i.test(referencedSchema)) continue;

      const referencedType = typeNameBySchema.get(referencedSchema) ?? referencedSchema;
      if (referencedType !== currentTypeName && knownTypeNames.has(referencedType)) {
        inheritedTypes.add(referencedType);
      }
      continue;
    }

    if (part?.type !== 'object' && !isObject(part?.properties)) continue;
    Object.assign(properties, part.properties ?? {});
    for (const property of part.required ?? []) required.add(property);
  }

  extendsTypes.push(...[...inheritedTypes].sort((left, right) => left.localeCompare(right)));
  return {
    schema: {type: 'object', properties, required: [...required]},
    extendsTypes,
  };
}

function ensureNullable(type) {
  return /\|\s*null\b/.test(type) ? type : `${type} | null`;
}

function buildModel({raw, typeName, typeNameBySchema, knownTypeNames, preferredFormat, requiredMode}) {
  const {schema, extendsTypes} = resolveObjectSchema(raw, typeName, typeNameBySchema, knownTypeNames);
  const isObjectLike = schema?.type === 'object' || isObject(schema?.properties) || extendsTypes.length > 0;
  if (!isObjectLike) return undefined;

  const isJsonLd = canonicalizeMediaType(preferredFormat) === DEFAULT_FORMAT;
  const requiredProperties = new Set(schema.required ?? []);
  const dependencies = new Set(extendsTypes);
  const forceNullable = requiredMode !== 'spec';

  const props = Object.entries(schema.properties ?? {})
    .filter(([propertyName]) => !isJsonLd || !['@id', '@type', '@context'].includes(propertyName))
    .map(([propertyName, propertySchema]) => {
      const baseType = tsTypeOf(propertySchema, dependencies, typeNameBySchema, {requiredMode});
      return {
        name: propertyName,
        tsKey: quoteKeyIfNeeded(propertyName),
        type: forceNullable ? ensureNullable(baseType) : withNullable(baseType, propertySchema),
        optional: requiredMode === 'spec' ? !requiredProperties.has(propertyName) : true,
      };
    });

  const imports = [...dependencies]
    .filter((dependency) => dependency !== typeName && knownTypeNames.has(dependency))
    .sort((left, right) => left.localeCompare(right));

  return {name: typeName, props, imports, extendsTypes, extendsItem: isJsonLd};
}

/**
 * Builds TypeScript model definitions from OpenAPI `components.schemas`.
 * @param {any} spec
 * @param {BuildOptions} [options]
 * @returns {{models: ModelDefinition[]}}
 */
export function buildModelsFromOpenAPI(spec, options = {}) {
  const schemas = spec?.components?.schemas ?? {};
  const formats = normalizeFormats(options.formats);
  const requiredMode = normalizeRequiredMode(options.requiredMode);
  const include = Array.isArray(options.includeSchemaNames) ? options.includeSchemaNames : [];
  const exclude = Array.isArray(options.excludeSchemaNames) ? options.excludeSchemaNames : [];

  const schemaToFormats = indexFormatsBySchema(spec, formats);
  const candidates = selectCandidateSchemas({schemas, schemaToFormats, include, exclude});
  const {preferredBySchema, priority} = choosePreferredFormats(candidates, formats, schemaToFormats);
  const typeNameBySchema = assignTypeNames(candidates, preferredBySchema, priority);
  const knownTypeNames = new Set(typeNameBySchema.values());

  const models = [];
  for (const schemaName of candidates) {
    const typeName = typeNameBySchema.get(schemaName);
    const raw = schemas[schemaName];
    if (!typeName || !raw) continue;

    const model = buildModel({
      raw,
      typeName,
      typeNameBySchema,
      knownTypeNames,
      preferredFormat: preferredBySchema.get(schemaName) ?? formats[0],
      requiredMode,
    });
    if (model) models.push(model);
  }

  return {models};
}
