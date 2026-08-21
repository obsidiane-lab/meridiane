import {resolveLocalRef, schemaNameFromRef} from './schema-utils.js';

function deref(spec, maybeRef) {
  if (!maybeRef || typeof maybeRef !== 'object') return maybeRef;
  if (typeof maybeRef.$ref === 'string') return resolveLocalRef(spec, maybeRef.$ref) || maybeRef;
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

const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

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
    }

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (key !== '$ref') walk(value);
    }
  }

  walk(schema);
}

function listSchemaRoots(spec, {mediaType} = {}) {
  const wantedLower = canonicalizeMediaType(mediaType);
  const roots = [];
  const visited = new Set();

  function addParameter(parameterOrRef) {
    const parameter = deref(spec, parameterOrRef);
    if (!parameter || typeof parameter !== 'object') return;
    if (parameter.schema) roots.push(parameter.schema);
    const contentSchema = getContentSchema(parameter.content, wantedLower);
    if (contentSchema) roots.push(contentSchema);
  }

  function addHeaders(headers) {
    for (const header of Object.values(headers ?? {})) addParameter(header);
  }

  function visitOperation(method, operationOrRef) {
    const operation = deref(spec, operationOrRef);
    if (!operation || typeof operation !== 'object') return;
    if (visited.has(operation)) return;
    visited.add(operation);

    for (const parameter of operation.parameters ?? []) addParameter(parameter);

    if (method !== 'patch') {
      const requestBody = deref(spec, operation.requestBody);
      const requestSchema = getContentSchema(requestBody?.content, wantedLower);
      if (requestSchema) roots.push(requestSchema);
    }

    for (const [code, responseOrRef] of Object.entries(operation.responses ?? {})) {
      if (!is2xxStatus(code) && String(code).toLowerCase() !== 'default') continue;
      const response = deref(spec, responseOrRef);
      const responseSchema = getContentSchema(response?.content, wantedLower);
      if (responseSchema) roots.push(responseSchema);
      addHeaders(response?.headers);
    }

    for (const callbackOrRef of Object.values(operation.callbacks ?? {})) {
      const callback = deref(spec, callbackOrRef);
      for (const pathItem of Object.values(callback ?? {})) visitPathItem(pathItem);
    }
  }

  function visitPathItem(pathItemOrRef) {
    const pathItem = deref(spec, pathItemOrRef);
    if (!pathItem || typeof pathItem !== 'object') return;
    if (visited.has(pathItem)) return;
    visited.add(pathItem);

    for (const parameter of pathItem.parameters ?? []) addParameter(parameter);
    for (const [method, operation] of Object.entries(pathItem)) {
      const normalizedMethod = method.toLowerCase();
      if (HTTP_METHODS.has(normalizedMethod)) visitOperation(normalizedMethod, operation);
    }
  }

  function visitPaths(paths) {
    for (const pathItem of Object.values(paths ?? {})) visitPathItem(pathItem);
  }

  visitPaths(spec?.paths);
  visitPaths(spec?.webhooks);

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
  const roots = listSchemaRoots(spec, cfg);
  const initialRefs = new Set();
  for (const root of roots) collectComponentSchemaRefs(root, initialRefs);
  return expandWithSchemaDependencies(initialRefs, schemas);
}
