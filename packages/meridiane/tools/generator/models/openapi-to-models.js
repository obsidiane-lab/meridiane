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

function getContentSchema(content, wantedLower) {
  if (!content || typeof content !== 'object') return undefined;
  for (const [k, v] of Object.entries(content)) {
    if (String(k).toLowerCase() === wantedLower) return v?.schema;
  }
  return undefined;
}

function is2xxStatus(code) {
  const s = String(code || '');
  return /^[0-9]{3}$/.test(s) && s.startsWith('2');
}

function collectRefsFromSchema(schema, out) {
  const seen = new Set();

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (node.$ref && typeof node.$ref === 'string') {
      out.add(schemaNameFromRef(node.$ref));
      return;
    }

    if (Array.isArray(node)) {
      for (const it of node) walk(it);
      return;
    }

    // Common JSON schema constructs (plus a generic fallback)
    if (node.allOf) walk(node.allOf);
    if (node.oneOf) walk(node.oneOf);
    if (node.anyOf) walk(node.anyOf);
    if (node.items) walk(node.items);
    if (node.properties) walk(node.properties);
    if (node.additionalProperties) walk(node.additionalProperties);

    for (const v of Object.values(node)) walk(v);
  }

  walk(schema);
}

function listNativeRootsFromPaths(spec, { mediaType = 'application/ld+json' } = {}) {
  const wantedLower = String(mediaType).toLowerCase();
  const roots = [];

  const paths = spec?.paths;
  if (!paths || typeof paths !== 'object') return roots;

  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const op of Object.values(pathItem)) {
      if (!op || typeof op !== 'object') continue;

      // requestBody (LD+JSON only)
      const rbSchema = getContentSchema(op.requestBody?.content, wantedLower);
      if (rbSchema) roots.push(rbSchema);

      // responses 2xx (LD+JSON only)
      const responses = op.responses;
      if (!responses || typeof responses !== 'object') continue;
      for (const [code, resp] of Object.entries(responses)) {
        if (!is2xxStatus(code)) continue;
        const schema = getContentSchema(resp?.content, wantedLower);
        if (schema) roots.push(schema);
      }
    }
  }

  return roots;
}

function parseOpenApiSchemaName(originalName) {
  const raw = String(originalName || '');
  const i = raw.indexOf('-');
  let baseRaw = i >= 0 ? raw.slice(0, i) : raw;
  let groupRaw = i >= 0 ? raw.slice(i + 1) : '';

  let baseVariant = 'none';
  if (/\.jsonld$/i.test(baseRaw)) {
    baseVariant = 'jsonld';
    baseRaw = baseRaw.replace(/\.jsonld$/i, '');
  } else if (/\.multipart$/i.test(baseRaw)) {
    baseVariant = 'multipart';
    baseRaw = baseRaw.replace(/\.multipart$/i, '');
  }

  let isMergePatch = false;
  if (/\.jsonmergepatch$/i.test(baseRaw)) {
    isMergePatch = true;
    baseRaw = baseRaw.replace(/\.jsonmergepatch$/i, '');
  }
  if (/\.jsonmergepatch$/i.test(groupRaw)) {
    isMergePatch = true;
    groupRaw = groupRaw.replace(/\.jsonmergepatch$/i, '');
  }

  return {
    originalName: raw,
    basePath: baseRaw,
    groupPath: groupRaw,
    baseVariant,
    isMergePatch,
    key: `${baseRaw.toLowerCase()}|${groupRaw.toLowerCase()}`,
  };
}

function pascalizeTokens(tokens) {
  return tokens
    .filter(Boolean)
    .map((t) => String(t).replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
    .filter(Boolean)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join('');
}

function baseTsNameFromBasePath(basePath) {
  const parts = String(basePath || '').split('.').filter(Boolean);
  if (parts.length === 0) return 'Model';
  const a = pascalizeTokens([parts[0]]);
  if (parts.length === 1) return a;
  const b = pascalizeTokens([parts[1]]);
  if (parts.length === 2 && b.toLowerCase().startsWith(a.toLowerCase())) return b;
  return parts.map((p) => pascalizeTokens([p])).join('');
}

function groupTsNameFromGroupPath(groupPath) {
  const tokens = String(groupPath || '').split(/[._:]+/g).filter(Boolean);
  return pascalizeTokens(tokens);
}

function stableUnion(types) {
  const uniq = [...new Set(types.filter(Boolean))];
  uniq.sort((a, b) => a.localeCompare(b));
  return uniq.join(' | ') || 'any';
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
  const preset = opts.preset ?? 'all';

  /** @type {ModelDefinition[]} */
  const models = [];

  if (preset !== 'native') {
    const schemaNames = applySchemaNameFilters(filterSchemaNames(schemas, opts), opts);
    const nameMap = buildNameMap(schemaNames, schemas, preset);
    const allSanitizedNames = new Set([...nameMap.values()]);

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
        const baseType = tsTypeOf(prop, deps, nameMap, { requiredMode: opts.requiredMode ?? 'all-optional', forceNullable: false });
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

    return { models };
  }

  // preset=native (v2): contract-driven (paths), LD+JSON, groups preserved, jsonld/non-jsonld merged.
  const roots = listNativeRootsFromPaths(spec, { mediaType: 'application/ld+json' });
  const initialRefs = new Set();
  for (const r of roots) collectRefsFromSchema(r, initialRefs);

  const usedSchemaNames = new Set();
  const queue = [...initialRefs];
  while (queue.length) {
    const name = queue.pop();
    if (!name || usedSchemaNames.has(name)) continue;
    usedSchemaNames.add(name);
    const schema = schemas[name];
    if (!schema) continue;
    const refs = new Set();
    collectRefsFromSchema(schema, refs);
    for (const ref of refs) if (ref && !usedSchemaNames.has(ref)) queue.push(ref);
  }

  // Group and merge by (basePath, groupPath), ignoring variants.
  const buckets = new Map();
  for (const originalName of [...usedSchemaNames].sort((a, b) => a.localeCompare(b))) {
    if (!originalName) continue;
    if (/^Hydra/i.test(originalName)) continue; // technical

    const parsed = parseOpenApiSchemaName(originalName);
    if (!parsed.basePath) continue;

    // User include/exclude filters (apply to canonical name and to raw variants)
    const canonical = parsed.groupPath ? `${parsed.basePath}-${parsed.groupPath}` : parsed.basePath;
    const fulls = [originalName, canonical];
    const include = Array.isArray(opts.includeSchemaNames) ? opts.includeSchemaNames : [];
    const exclude = Array.isArray(opts.excludeSchemaNames) ? opts.excludeSchemaNames : [];

    const matches = (val, rule) => {
      if (rule instanceof RegExp) return rule.test(val);
      if (typeof rule === 'function') return !!rule(val);
      if (typeof rule === 'string' && rule.length) return val.includes(rule);
      return false;
    };

    const hasInclude = include.length > 0;
    const included = !hasInclude || include.some((r) => fulls.some((v) => matches(v, r)));
    const excluded = exclude.some((r) => fulls.some((v) => matches(v, r)));
    if (!included || excluded) continue;

    const bucket = buckets.get(parsed.key) || { basePath: parsed.basePath, groupPath: parsed.groupPath, entries: [] };
    bucket.entries.push(parsed);
    buckets.set(parsed.key, bucket);
  }

  // Stable bucket ordering
  const bucketList = [...buckets.values()].sort((a, b) => {
    const ka = `${a.basePath}-${a.groupPath}`.toLowerCase();
    const kb = `${b.basePath}-${b.groupPath}`.toLowerCase();
    return ka.localeCompare(kb);
  });

  // Compute TS names (unique) and build originalName -> tsName map (all variants in a bucket).
  const usedTsNames = new Set();
  const nameMap = new Map();
  for (const b of bucketList) {
    const baseTs = baseTsNameFromBasePath(b.basePath);
    const groupTs = groupTsNameFromGroupPath(b.groupPath);
    const desired = `${baseTs}${groupTs}` || 'Model';
    const tsName = sanitizeTypeName(desired, usedTsNames);
    b.tsName = tsName;
    for (const e of b.entries) {
      nameMap.set(e.originalName, tsName);
    }
  }
  const allSanitizedNames = new Set(bucketList.map((b) => b.tsName));

  // Generate merged models per bucket.
  for (const b of bucketList) {
    const sanitized = b.tsName;
    if (!sanitized) continue;

    const deps = new Set();
    const extendsSet = new Set();
    const propTypes = new Map(); // propName -> Set<tsType>

    // Choose candidates: jsonld + base (no multipart, no merge-patch)
    const candidates = b.entries
      .filter((e) => !e.isMergePatch)
      .filter((e) => e.baseVariant !== 'multipart')
      .sort((a, b2) => {
        const score = (e) => (e.baseVariant === 'jsonld' ? 2 : 1);
        const sa = score(a), sb = score(b2);
        if (sb !== sa) return sb - sa;
        return a.originalName.localeCompare(b2.originalName);
      });

    for (const e of candidates) {
      const raw = schemas[e.originalName];
      if (!raw) continue;

      let effective = raw;
      /** @type {string[]} */
      const extendsTypes = [];

      if (raw?.allOf) {
        const merged = mergeAllOf(raw.allOf);
        if (merged) {
          effective = merged;
        } else {
          const props = {};
          const ext = new Set();
          for (const part of raw.allOf) {
            if (part?.$ref) {
              const orig = schemaNameFromRef(part.$ref);
              const refName = orig ? nameMap.get(orig) || orig : undefined;
              if (refName && refName !== sanitized && allSanitizedNames.has(refName)) ext.add(refName);
              continue;
            }
            const isObj = part?.type === 'object' || isObject(part?.properties);
            if (!isObj) continue;
            Object.assign(props, part.properties || {});
          }
          extendsTypes.push(...[...ext].sort((a, b3) => a.localeCompare(b3)));
          effective = { type: 'object', properties: props };
        }
      }

      const isObjectLike = effective?.type === 'object' || isObject(effective?.properties) || extendsTypes.length > 0;
      if (!isObjectLike) continue;

      for (const ex of extendsTypes) extendsSet.add(ex);

      for (const [propName, prop] of Object.entries(effective.properties || {})) {
        const baseType = tsTypeOf(prop, deps, nameMap, { requiredMode: 'all-optional', forceNullable: true });
        const existing = propTypes.get(propName) || new Set();
        existing.add(baseType);
        propTypes.set(propName, existing);
      }
    }

    const extendsTypes = [...extendsSet]
      .filter((n) => n !== sanitized)
      .filter((n) => allSanitizedNames.has(n))
      .sort((a, b2) => a.localeCompare(b2));

    // Imports are any referenced model types (+ extends), excluding self.
    for (const e of extendsTypes) deps.add(e);
    const imports = [...deps]
      .filter((n) => n !== sanitized)
      .filter((n) => allSanitizedNames.has(n))
      .sort((a, b2) => a.localeCompare(b2));

    const props = [...propTypes.keys()]
      .sort((a, b2) => a.localeCompare(b2))
      .map((propName) => {
        const union = stableUnion([...propTypes.get(propName)]);
        const type = /\|\s*null\b/.test(union) ? union : `${union} | null`;
        return {
          name: propName,
          tsKey: quoteKeyIfNeeded(propName),
          type,
          optional: true,
        };
      });

    // Skip empty models (no props + no extends): avoid polluting exports.
    if (props.length === 0 && extendsTypes.length === 0) continue;

    models.push({ name: sanitized, props, imports, extendsTypes });
  }

  return { models };
}
