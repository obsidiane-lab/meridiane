import { sanitizeTypeName, quoteKeyIfNeeded } from './utils.js';
import { mergeAllOf, isObject, schemaNameFromRef } from './schema-utils.js';
import { tsTypeOf, withNullable } from './type-resolver.js';
import { canonicalizeMediaType, collectUsedSchemasForMediaType, expandWithSchemaDependencies } from './oas-contract.js';
import { baseTsNameFromBasePath, formatSuffixToken, groupTsNameFromGroupPath, parseOpenApiSchemaName } from './oas-schema-name.js';

/**
 * @typedef {{
 *   requiredMode?: 'all'|'spec',
 *   formats?: string[],
 *   includeSchemaNames?: Array<RegExp|string|((name: string) => boolean)>,
 *   excludeSchemaNames?: Array<RegExp|string|((name: string) => boolean)>,
 * }} BuildOptions
 */

/**
 * @typedef {{
 *   name: string,
 *   tsKey: string,
 *   type: string,
 *   optional: boolean,
 * }} ModelProp
 */

/**
 * @typedef {{
 *   name: string,
 *   props: ModelProp[],
 *   imports: string[],
 *   extendsTypes: string[],
 *   extendsItem?: boolean,
 * }} ModelDefinition
 */

function ensureNullable(ts) {
  return /\|\s*null\b/.test(ts) ? ts : `${ts} | null`;
}

function normalizeRequiredMode(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return 'all';
  if (v === 'spec') return 'spec';
  if (v === 'all') return 'all';
  return 'all';
}

/**
 * Construit les définitions de modèles à partir d’une spec OpenAPI (components.schemas)
 * @param {any} spec
 * @param {BuildOptions} [options]
 * @returns {{ models: ModelDefinition[] }}
 */
export function buildModelsFromOpenAPI(spec, options) {
  const opts = { requiredMode: 'all', ...(options || {}) };
  const schemas = spec?.components?.schemas || {};
  const formatsOpt = Array.isArray(opts.formats) ? opts.formats : [];
  const formats = formatsOpt.length > 0 ? formatsOpt : ['application/ld+json'];
  const requiredMode = normalizeRequiredMode(opts.requiredMode);

  /** @type {ModelDefinition[]} */
  const models = [];

  // Contract-driven (formats): keep only schemas used by selected media types in real endpoints.
  const normalizedFormats = [];
  for (const f of formats) {
    const canon = canonicalizeMediaType(f);
    if (!canon) continue;
    if (!normalizedFormats.includes(canon)) normalizedFormats.push(canon);
  }
  if (normalizedFormats.length === 0) normalizedFormats.push('application/ld+json');

  /** @type {Map<string, Set<string>>} */
  const usedByFormat = new Map(); // formatLower -> Set<schemaName>

  for (const fmt of normalizedFormats) {
    usedByFormat.set(fmt, collectUsedSchemasForMediaType(spec, { mediaType: fmt }));
  }

  /** @type {Map<string, Set<string>>} */
  const schemaToFormats = new Map();
  for (const [fmt, names] of usedByFormat.entries()) {
    for (const name of names) {
      if (!name) continue;
      const set = schemaToFormats.get(name) || new Set();
      set.add(fmt);
      schemaToFormats.set(name, set);
    }
  }

  const include = Array.isArray(opts.includeSchemaNames) ? opts.includeSchemaNames : [];
  const exclude = Array.isArray(opts.excludeSchemaNames) ? opts.excludeSchemaNames : [];
  const matches = (val, rule) => {
    if (rule instanceof RegExp) return rule.test(val);
    if (typeof rule === 'function') return !!rule(val);
    if (typeof rule === 'string' && rule.length) return val.includes(rule);
    return false;
  };

  const allUsed = [...schemaToFormats.keys()]
    .filter(Boolean)
    .filter((n) => !/^Hydra/i.test(n))
    .sort((a, b) => a.localeCompare(b))
    .filter((originalName) => {
      const parsed = parseOpenApiSchemaName(originalName);
      const canonical = parsed.groupPath ? `${parsed.basePath}-${parsed.groupPath}` : parsed.basePath;
      const fulls = [originalName, canonical];

      const hasInclude = include.length > 0;
      const included = !hasInclude || include.some((r) => fulls.some((v) => matches(v, r)));
      const excluded = exclude.some((r) => fulls.some((v) => matches(v, r)));
      return included && !excluded;
    });

  // Ensure filters never break compilation: always keep transitive deps of selected schemas.
  const candidatesSet = include.length > 0 || exclude.length > 0 ? expandWithSchemaDependencies(allUsed, schemas) : new Set(allUsed);

  const candidates = [...candidatesSet]
    .filter((n) => !!n)
    .filter((n) => !/^Hydra/i.test(n))
    .sort((a, b) => a.localeCompare(b));

  // Assign a preferred format to each schema (used for naming + JSON-LD behavior).
  const formatIndex = new Map(normalizedFormats.map((f, i) => [f, i]));
  const schemaEntries = candidates.map((schemaName) => {
    const fmts = schemaToFormats.get(schemaName) || new Set();
    const best = [...fmts].sort((a, b) => (formatIndex.get(a) ?? 999) - (formatIndex.get(b) ?? 999))[0] || normalizedFormats[0];
    return { schemaName, preferredFormat: best, preferredFormatIndex: formatIndex.get(best) ?? 0 };
  });
  const preferredFormatBySchema = new Map(schemaEntries.map((e) => [e.schemaName, e.preferredFormat]));

  // Compute desired TS names (format-agnostic), then disambiguate collisions by preferred format.
  const byDesired = new Map(); // desired -> entries[]
  for (const e of schemaEntries) {
    const parsed = parseOpenApiSchemaName(e.schemaName);
    if (parsed.isMergePatch) continue; // never generate patch models
    const baseTs = baseTsNameFromBasePath(parsed.basePath);
    const groupTs = groupTsNameFromGroupPath(parsed.groupPath);
    const desired = `${baseTs}${groupTs}` || 'Model';
    const list = byDesired.get(desired) || [];
    list.push({ ...e, desired });
    byDesired.set(desired, list);
  }

  // Assign unique TS names and build schemaName -> tsName map.
  const usedTsNames = new Set();
  const nameMap = new Map();
  for (const [desired, list] of [...byDesired.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    list.sort((a, b) => {
      const da = a.preferredFormatIndex - b.preferredFormatIndex;
      if (da !== 0) return da;
      return a.schemaName.localeCompare(b.schemaName);
    });

    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      const withFmt = i === 0 ? desired : `${desired}${formatSuffixToken(entry.preferredFormat)}`;
      const tsName = sanitizeTypeName(withFmt, usedTsNames);
      nameMap.set(entry.schemaName, tsName);
    }
  }
  const allSanitizedNames = new Set([...nameMap.values()]);

  for (const schemaName of candidates) {
    const sanitized = nameMap.get(schemaName);
    if (!sanitized) continue;

    const raw = schemas[schemaName];
    if (!raw) continue;

    const preferredFormat = preferredFormatBySchema.get(schemaName) ?? normalizedFormats[0];
    const isJsonLd = canonicalizeMediaType(preferredFormat) === 'application/ld+json';
    const forceNullable = requiredMode !== 'spec';

    /** @type {string[]} */
    const extendsTypes = [];
    const deps = new Set();

    let effective = raw;
    if (raw?.allOf) {
      const merged = mergeAllOf(raw.allOf);
      if (merged) {
        effective = merged;
      } else {
        // Non-flattenable allOf: keep inline object props + other model refs as extends.
        const props = {};
        const required = new Set();
        const ext = new Set();

        for (const part of raw.allOf) {
          if (part?.$ref) {
            const orig = schemaNameFromRef(part.$ref);
            if (!orig) continue;
            if (/^Hydra/i.test(orig)) continue;
            const refName = orig ? nameMap.get(orig) || orig : undefined;
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

    for (const e of extendsTypes) deps.add(e);

    const required = new Set(effective.required || []);
    const props = Object.entries(effective.properties || {})
      .filter(([propName]) => {
        if (!isJsonLd) return true;
        return propName !== '@id' && propName !== '@type' && propName !== '@context';
      })
      .map(([propName, prop]) => {
        const baseType = tsTypeOf(prop, deps, nameMap, { requiredMode });
        const type = forceNullable ? ensureNullable(baseType) : withNullable(baseType, prop);
        return {
          name: propName,
          tsKey: quoteKeyIfNeeded(propName),
          type,
          optional: requiredMode === 'spec' ? !required.has(propName) : true,
        };
      });

    const imports = [...deps]
      .filter((n) => n !== sanitized)
      .filter((n) => allSanitizedNames.has(n))
      .sort((a, b) => a.localeCompare(b));

    models.push({ name: sanitized, props, imports, extendsTypes, extendsItem: isJsonLd });
  }

  return { models };
}
