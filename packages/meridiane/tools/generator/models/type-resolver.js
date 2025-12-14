import { schemaNameFromRef } from './schema-utils.js';
import { quoteKeyIfNeeded } from './utils.js';

/**
 * Ajoute | null à un type TS si le schéma est nullable (compat OAS 3.0),
 * sauf si 'null' est déjà présent dans l'union.
 * @param {string} ts
 * @param {any} schema
 */
export function withNullable(ts, schema) {
  return schema?.nullable && !/\|\s*null\b/.test(ts) ? `${ts} | null` : ts;
}

/**
 * Résout un schéma OpenAPI vers un type TypeScript, en collectant les dépendances ($ref)
 * @param {any} schema
 * @param {Set<string>} deps
 * @param {Map<string,string>} nameMap
 * @param {{ requiredMode?: 'all'|'spec' }} [cfg]
 * @returns {string}
 */
export function tsTypeOf(schema, deps, nameMap, cfg) {
  if (!schema) return 'any';
  const requiredMode = cfg?.requiredMode ?? 'all';
  const forceNullable = requiredMode !== 'spec';

  if (schema.$ref) {
    const orig = schemaNameFromRef(schema.$ref);
    if (!orig) return 'any';
    if (/jsonMergePatch/i.test(orig)) return 'any';
    if (/^Hydra/i.test(orig)) return 'any';
    const name = nameMap.get(orig) || orig;
    deps.add(name);
    return name;
  }

  // Enum prioritaires: union littérale (supporte null)
  if (schema.enum) {
    const lit = schema.enum.map((v) => {
      if (v === null) return 'null';
      if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`;
      if (typeof v === 'number' || typeof v === 'bigint') return String(v);
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      return 'any';
    });
    return [...new Set(lit)].join(' | ');
  }

  // OpenAPI 3.1: null explicite et tableau de types (union)
  if (schema.type === 'null') return 'null';
  if (Array.isArray(schema.type)) {
    const parts = new Set();
    for (const t of schema.type) {
      if (t === 'null') parts.add('null');
      else if (t === 'string') parts.add('string');
      else if (t === 'integer' || t === 'number') parts.add('number');
      else if (t === 'boolean') parts.add('boolean');
      else if (t === 'array') parts.add(tsTypeOf({ type: 'array', items: schema.items }, deps, nameMap, cfg));
      else if (t === 'object') {
        const objTs = tsTypeOf(
          { type: 'object', properties: schema.properties, required: schema.required, additionalProperties: schema.additionalProperties },
          deps,
          nameMap,
          cfg
        );
        parts.add(objTs);
      } else parts.add('any');
    }
    return [...parts].join(' | ');
  }

  if (schema.allOf) {
    // Aplatir au niveau buildModelsFromOpenAPI; ici on combine si nécessaire
    return schema.allOf.map((s) => tsTypeOf(s, deps, nameMap, cfg)).join(' & ');
  }
  if (schema.oneOf) return schema.oneOf.map((s) => tsTypeOf(s, deps, nameMap, cfg)).join(' | ');
  if (schema.anyOf) return schema.anyOf.map((s) => tsTypeOf(s, deps, nameMap, cfg)).join(' | ');

  if (schema.type === 'array') {
    const it = tsTypeOf(schema.items || {}, deps, nameMap, cfg);
    return `${it}[]`;
  }

  if (schema.type === 'object' || (schema.properties || schema.additionalProperties)) {
    const props = schema.properties || {};
    const entries = Object.entries(props);
    const inline = entries.map(([k, v]) => {
      const t0 = tsTypeOf(v, deps, nameMap, cfg);
      const opt = requiredMode === 'spec' ? ((schema.required || []).includes(k) ? '' : '?') : '?';
      const wantsNull = forceNullable || v?.nullable;
      const nullable = wantsNull && !/\|\s*null\b/.test(t0) ? ' | null' : '';
      const key = quoteKeyIfNeeded(k);
      return `${key}${opt}: ${t0}${nullable};`;
    });
    if (schema.additionalProperties) {
      const at = tsTypeOf(schema.additionalProperties, deps, nameMap, cfg);
      inline.push(`[key: string]: ${at};`);
    }
    return `{ ${inline.join(' ')} }`;
  }

  if (schema.type === 'string') return 'string';
  if (schema.type === 'integer' || schema.type === 'number') return 'number';
  if (schema.type === 'boolean') return 'boolean';

  return 'any';
}
