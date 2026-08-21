import { schemaNameFromRef } from './schema-utils.js';

function resolveRefPointer(spec, ref) {
  const pointer = String(ref || '');
  if (!pointer.startsWith('#/')) return undefined;

  const segments = pointer.slice(2).split('/').filter(Boolean);
  let current = spec;
  for (const segment of segments) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[segment];
  }
  return current;
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
  for (const [mediaType, definition] of Object.entries(content)) {
    if (canonicalizeMediaType(mediaType) === wantedLower) return definition?.schema;
  }
  return undefined;
}

function is2xxStatus(code) {
  const status = String(code || '');
  if (/^[0-9]{3}$/.test(status)) return status.startsWith('2');
  return /^2xx$/i.test(status);
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
      for (const item of node) walk(item);
      return;
    }

    for (const value of Object.values(node)) walk(value);
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
    for (const [method, operationOrRef] of Object.entries(pathItem)) {
      const operation = deref(spec, operationOrRef);
      if (!operation || typeof operation !== 'object') continue;

      const isPatch = String(method || '').toLowerCase() === 'patch';

      if (!isPatch) {
        const requestBody = deref(spec, operation.requestBody);
        const requestSchema = getContentSchema(requestBody?.content, wantedLower);
        if (requestSchema) roots.push(requestSchema);
      }

      const responses = operation.responses;
      if (!responses || typeof responses !== 'object') continue;
      for (const [code, responseOrRef] of Object.entries(responses)) {
        if (!is2xxStatus(code) && String(code).toLowerCase() !== 'default') continue;
        const response = deref(spec, responseOrRef);
        const schema = getContentSchema(response?.content, wantedLower);
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

  for (const schemaName of start) {
    if (!schemaName || out.has(schemaName)) continue;
    out.add(schemaName);
    queue.push(schemaName);
  }

  while (queue.length) {
    const name = queue.pop();
    const schema = schemas[name];
    if (!schema) continue;
    const refs = new Set();
    collectComponentSchemaRefs(schema, refs);
    for (const dependency of refs) {
      if (!dependency || out.has(dependency)) continue;
      out.add(dependency);
      queue.push(dependency);
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
  for (const root of roots) collectComponentSchemaRefs(root, initialRefs);
  return expandWithSchemaDependencies(initialRefs, schemas);
}
