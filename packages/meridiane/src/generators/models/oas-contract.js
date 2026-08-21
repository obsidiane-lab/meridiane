import { schemaNameFromRef } from './schema-utils.js';

function resolveRefPointer(spec, ref) {
  const s = String(ref || '');
  if (!s.startsWith('#/')) return undefined;
  const parts = s.slice(2).split('/').filter(Boolean);
  let cur = spec;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function deref(spec, maybeRef) {
  if (!maybeRef || typeof maybeRef !== 'object') return maybeRef;
  if (typeof maybeRef.$ref === 'string') return resolveRefPointer(spec, maybeRef.$ref) || maybeRef;
  return maybeRef;
}

export function canonicalizeMediaType(mediaType) {
  return String(mediaType || '').split(';')[0].trim().toLowerCase();
}

function getContentSchema(content, wantedLower) {
  if (!content || typeof content !== 'object') return undefined;
  for (const [k, v] of Object.entries(content)) {
    const canon = canonicalizeMediaType(k);
    if (canon === wantedLower) return v?.schema;
  }
  return undefined;
}

function is2xxStatus(code) {
  const s = String(code || '');
  if (/^[0-9]{3}$/.test(s)) return s.startsWith('2');
  return /^2xx$/i.test(s);
}

/**
 * Collects only component schema refs (`#/components/schemas/*`) found in a JSON schema.
 * @param {any} schema
 * @param {Set<string>} out
 */
function collectComponentSchemaRefs(schema, out) {
  const seen = new Set();

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (node.$ref && typeof node.$ref === 'string') {
      const name = schemaNameFromRef(node.$ref);
      if (name) out.add(name);
      return;
    }

    if (Array.isArray(node)) {
      for (const it of node) walk(it);
      return;
    }

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

/**
 * Extracts root schemas from endpoints for one media type.
 * - requestBody is ignored for PATCH (merge-patch typed as Partial<> elsewhere)
 * - responses keep only 2xx and default
 */
function listRootsFromPaths(spec, { mediaType } = {}) {
  const wantedLower = canonicalizeMediaType(mediaType);
  const roots = [];

  const paths = spec?.paths;
  if (!paths || typeof paths !== 'object') return roots;

  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const [method, op0] of Object.entries(pathItem)) {
      const op = deref(spec, op0);
      if (!op || typeof op !== 'object') continue;

      const isPatch = String(method || '').toLowerCase() === 'patch';

      if (!isPatch) {
        const rb = deref(spec, op.requestBody);
        const rbSchema = getContentSchema(rb?.content, wantedLower);
        if (rbSchema) roots.push(rbSchema);
      }

      const responses = op.responses;
      if (!responses || typeof responses !== 'object') continue;
      for (const [code, resp] of Object.entries(responses)) {
        if (!is2xxStatus(code) && String(code).toLowerCase() !== 'default') continue;
        const resolved = deref(spec, resp);
        const schema = getContentSchema(resolved?.content, wantedLower);
        if (schema) roots.push(schema);
      }
    }
  }

  return roots;
}

/**
 * Returns the transitive closure of schema dependencies (following component-schema $ref).
 * @param {Iterable<string>} start
 * @param {Record<string, any>} schemas
 */
export function expandWithSchemaDependencies(start, schemas) {
  const out = new Set();
  const queue = [];

  for (const n of start) {
    if (!n || out.has(n)) continue;
    out.add(n);
    queue.push(n);
  }

  while (queue.length) {
    const name = queue.pop();
    const schema = schemas[name];
    if (!schema) continue;
    const refs = new Set();
    collectComponentSchemaRefs(schema, refs);
    for (const ref of refs) {
      if (!ref || out.has(ref)) continue;
      out.add(ref);
      queue.push(ref);
    }
  }

  return out;
}

/**
 * Collects all component schemas used by endpoints for one media type.
 * @param {any} spec
 * @param {{ mediaType: string }} cfg
 */
export function collectUsedSchemasForMediaType(spec, cfg) {
  const schemas = spec?.components?.schemas || {};
  const roots = listRootsFromPaths(spec, cfg);
  const initialRefs = new Set();
  for (const r of roots) collectComponentSchemaRefs(r, initialRefs);
  return expandWithSchemaDependencies(initialRefs, schemas);
}
