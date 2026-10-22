import {schemaNameFromRef} from './schema-utils.js';

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
