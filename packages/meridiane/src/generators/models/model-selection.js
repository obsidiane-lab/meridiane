import {
  canonicalizeMediaType,
  collectUsedSchemasForMediaType,
  expandWithSchemaDependencies,
} from './oas-contract.js';
import {
  baseTsNameFromBasePath,
  formatSuffixToken,
  groupTsNameFromGroupPath,
  parseOpenApiSchemaName,
} from './oas-schema-name.js';
import {sanitizeTypeName} from './utils.js';

export const DEFAULT_MODEL_FORMAT = 'application/ld+json';

function normalizeFormats(values) {
  const formats = [];
  for (const value of Array.isArray(values) ? values : []) {
    const format = canonicalizeMediaType(value);
    if (format && !formats.includes(format)) formats.push(format);
  }
  return formats.length > 0 ? formats : [DEFAULT_MODEL_FORMAT];
}

function indexFormatsBySchema(spec, formats) {
  const formatsBySchema = new Map();

  for (const format of formats) {
    const schemaNames = collectUsedSchemasForMediaType(spec, {mediaType: format});
    for (const schemaName of schemaNames) {
      if (!schemaName) continue;
      const schemaFormats = formatsBySchema.get(schemaName) ?? new Set();
      schemaFormats.add(format);
      formatsBySchema.set(schemaName, schemaFormats);
    }
  }

  return formatsBySchema;
}

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

function selectCandidates(schemas, formatsBySchema, include, exclude) {
  const selected = [...formatsBySchema.keys()]
    .filter((name) => name && !/^Hydra/i.test(name))
    .sort((left, right) => left.localeCompare(right))
    .filter((name) => isSelected(name, include, exclude));

  const candidates = include.length > 0 || exclude.length > 0
    ? expandWithSchemaDependencies(selected, schemas)
    : new Set(selected);

  return [...candidates]
    .filter((name) => name && !/^Hydra/i.test(name))
    .sort((left, right) => left.localeCompare(right));
}

function choosePreferredFormats(schemaNames, formats, formatsBySchema) {
  const formatPriority = new Map(formats.map((format, index) => [format, index]));
  const preferredFormats = new Map();

  for (const schemaName of schemaNames) {
    const schemaFormats = [...(formatsBySchema.get(schemaName) ?? [])];
    const preferred = schemaFormats.sort(
      (left, right) => (formatPriority.get(left) ?? 999) - (formatPriority.get(right) ?? 999)
    )[0] ?? formats[0];
    preferredFormats.set(schemaName, preferred);
  }

  return {preferredFormats, formatPriority};
}

function desiredTypeName(schemaName) {
  const parsed = parseOpenApiSchemaName(schemaName);
  if (parsed.isMergePatch) return undefined;

  const base = baseTsNameFromBasePath(parsed.basePath);
  const group = groupTsNameFromGroupPath(parsed.groupPath);
  return `${base}${group}` || 'Model';
}

function assignTypeNames(schemaNames, preferredFormats, formatPriority) {
  const schemasByDesiredName = new Map();

  for (const schemaName of schemaNames) {
    const desiredName = desiredTypeName(schemaName);
    if (!desiredName) continue;

    const entries = schemasByDesiredName.get(desiredName) ?? [];
    entries.push({schemaName, preferredFormat: preferredFormats.get(schemaName)});
    schemasByDesiredName.set(desiredName, entries);
  }

  const usedNames = new Set();
  const typeNames = new Map();
  const sortedGroups = [...schemasByDesiredName.entries()]
    .sort(([left], [right]) => left.localeCompare(right));

  for (const [desiredName, entries] of sortedGroups) {
    entries.sort((left, right) => {
      const byFormat =
        (formatPriority.get(left.preferredFormat) ?? 999) -
        (formatPriority.get(right.preferredFormat) ?? 999);
      return byFormat || left.schemaName.localeCompare(right.schemaName);
    });

    entries.forEach((entry, index) => {
      const candidateName = index === 0
        ? desiredName
        : `${desiredName}${formatSuffixToken(entry.preferredFormat)}`;
      typeNames.set(entry.schemaName, sanitizeTypeName(candidateName, usedNames));
    });
  }

  return typeNames;
}

export function selectModelSchemas(spec, options = {}) {
  const schemas = spec?.components?.schemas ?? {};
  const formats = normalizeFormats(options.formats);
  const include = Array.isArray(options.includeSchemaNames) ? options.includeSchemaNames : [];
  const exclude = Array.isArray(options.excludeSchemaNames) ? options.excludeSchemaNames : [];
  const formatsBySchema = indexFormatsBySchema(spec, formats);
  const schemaNames = selectCandidates(schemas, formatsBySchema, include, exclude);
  const {preferredFormats, formatPriority} = choosePreferredFormats(
    schemaNames,
    formats,
    formatsBySchema
  );
  const typeNames = assignTypeNames(schemaNames, preferredFormats, formatPriority);

  return {schemas, formats, schemaNames, preferredFormats, typeNames};
}
