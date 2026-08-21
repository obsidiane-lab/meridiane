import { schemaNameFromRef } from './schema-utils.js';
import { quoteKeyIfNeeded } from './utils.js';

const PRIMITIVE_TYPES = {
  string: 'string',
  integer: 'number',
  number: 'number',
  boolean: 'boolean',
  null: 'null',
};

/**
 * Ajoute | null à un type TS si le schéma est nullable (compat OAS 3.0),
 * sauf si 'null' est déjà présent dans l'union.
 * @param {string} ts
 * @param {any} schema
 */
export function withNullable(ts, schema) {
  return schema?.nullable && !/\|\s*null\b/.test(ts) ? `${ts} | null` : ts;
}

function literalType(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return String(value);
  return 'any';
}

function unionMemberType(type, schema, deps, nameMap, cfg) {
  if (type in PRIMITIVE_TYPES) return PRIMITIVE_TYPES[type];
  if (type === 'array') return tsTypeOf({type, items: schema.items}, deps, nameMap, cfg);
  if (type === 'object') {
    return tsTypeOf(
      {
        type,
        properties: schema.properties,
        required: schema.required,
        additionalProperties: schema.additionalProperties,
      },
      deps,
      nameMap,
      cfg
    );
  }
  return 'any';
}

function inlineObjectType(schema, deps, nameMap, cfg) {
  const requiredMode = cfg?.requiredMode ?? 'all';
  const required = new Set(schema.required ?? []);
  const properties = Object.entries(schema.properties ?? {}).map(([key, property]) => {
    const baseType = tsTypeOf(property, deps, nameMap, cfg);
    const optional = requiredMode === 'spec' && required.has(key) ? '' : '?';
    const nullable = requiredMode !== 'spec' || property?.nullable;
    const type = nullable && !/\|\s*null\b/.test(baseType) ? `${baseType} | null` : baseType;
    return `${quoteKeyIfNeeded(key)}${optional}: ${type};`;
  });

  if (schema.additionalProperties) {
    const valueType = tsTypeOf(schema.additionalProperties, deps, nameMap, cfg);
    properties.push(`[key: string]: ${valueType};`);
  }

  return `{ ${properties.join(' ')} }`;
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

  if (schema.$ref) {
    const referencedSchema = schemaNameFromRef(schema.$ref);
    if (!referencedSchema || /jsonMergePatch/i.test(referencedSchema) || /^Hydra/i.test(referencedSchema)) {
      return 'any';
    }
    const name = nameMap.get(referencedSchema) ?? referencedSchema;
    deps.add(name);
    return name;
  }

  if (schema.enum) {
    return [...new Set(schema.enum.map(literalType))].join(' | ');
  }

  if (Array.isArray(schema.type)) {
    const types = schema.type.map((type) => unionMemberType(type, schema, deps, nameMap, cfg));
    return [...new Set(types)].join(' | ');
  }

  if (schema.allOf) {
    return schema.allOf.map((part) => tsTypeOf(part, deps, nameMap, cfg)).join(' & ');
  }
  if (schema.oneOf) return schema.oneOf.map((part) => tsTypeOf(part, deps, nameMap, cfg)).join(' | ');
  if (schema.anyOf) return schema.anyOf.map((part) => tsTypeOf(part, deps, nameMap, cfg)).join(' | ');

  if (schema.type === 'array') {
    return `${tsTypeOf(schema.items ?? {}, deps, nameMap, cfg)}[]`;
  }

  if (schema.type === 'object' || (schema.properties || schema.additionalProperties)) {
    return inlineObjectType(schema, deps, nameMap, cfg);
  }

  return PRIMITIVE_TYPES[schema.type] ?? 'any';
}
