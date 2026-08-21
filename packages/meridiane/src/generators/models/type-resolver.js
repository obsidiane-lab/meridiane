import {hasOwn, resolveLocalRef, schemaNameFromRef} from './schema-utils.js';
import {
  arrayType,
  atomicType,
  formatType,
  intersectionType,
  nullableType,
  unionType,
} from './type-expression.js';
import {quoteKeyIfNeeded, quoteStringLiteral} from './utils.js';

const PRIMITIVE_TYPES = {
  string: 'string',
  integer: 'number',
  number: 'number',
  boolean: 'boolean',
  null: 'null',
};

function literalExpression(value) {
  if (value === null) return atomicType('null', true);
  if (typeof value === 'string') return atomicType(quoteStringLiteral(value));
  if (typeof value === 'number' || typeof value === 'bigint') return atomicType(String(value));
  if (typeof value === 'boolean') return atomicType(String(value));

  if (Array.isArray(value)) {
    const items = value.map((item) => literalExpression(item).code);
    return atomicType(`[${items.join(', ')}]`);
  }

  if (value && typeof value === 'object') {
    const properties = Object.entries(value).map(([key, item]) =>
      `${quoteKeyIfNeeded(key)}: ${literalExpression(item).code};`
    );
    return atomicType(`{ ${properties.join(' ')} }`);
  }

  return atomicType('any');
}

function tupleMember(type, optional = false) {
  return optional ? `${formatType(type)}?` : type.code;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

/**
 * Creates one resolver for a model. Its lexical context owns name resolution,
 * dependency collection and local-reference cycle detection.
 */
export function createTypeResolver({
  dependencies = new Set(),
  typeNames = new Map(),
  requiredMode = 'all',
  spec,
} = {}) {
  const resolvingRefs = new Set();

  function resolveReference(ref) {
    const componentName = schemaNameFromRef(ref);
    if (componentName) {
      if (/jsonMergePatch/i.test(componentName) || /^Hydra/i.test(componentName)) {
        return atomicType('any');
      }

      const typeName = typeNames.get(componentName) ?? componentName;
      dependencies.add(typeName);
      return atomicType(typeName);
    }

    const target = resolveLocalRef(spec, ref);
    if (target === undefined || resolvingRefs.has(ref)) return atomicType('any');

    resolvingRefs.add(ref);
    try {
      return resolve(target);
    } finally {
      resolvingRefs.delete(ref);
    }
  }

  function resolveProperty(schema) {
    const type = resolve(schema);
    return requiredMode === 'spec' ? type : nullableType(type);
  }

  function resolveDictionaryValue(additionalProperties, properties) {
    const additionalType = additionalProperties === true
      ? atomicType('any')
      : resolve(additionalProperties);
    if (additionalType.code === 'any') return additionalType;

    const memberTypes = properties.map(({type}) => type);
    if (properties.some(({optional}) => optional)) memberTypes.push(atomicType('undefined'));
    return unionType([additionalType, ...memberTypes]);
  }

  function resolveObject(schema) {
    const requiredProperties = new Set(schema.required ?? []);
    const properties = Object.entries(schema.properties ?? {}).map(([key, propertySchema]) => ({
      key,
      optional: requiredMode !== 'spec' || !requiredProperties.has(key),
      type: resolveProperty(propertySchema),
    }));
    const members = properties.map(({key, optional, type}) =>
      `${quoteKeyIfNeeded(key)}${optional ? '?' : ''}: ${type.code};`
    );

    if (hasOwn(schema, 'additionalProperties') && schema.additionalProperties !== false) {
      const valueType = resolveDictionaryValue(schema.additionalProperties, properties);
      members.push(`[key: string]: ${valueType.code};`);
    } else if (properties.length === 0) {
      const valueType = schema.additionalProperties === false ? 'never' : 'any';
      members.push(`[key: string]: ${valueType};`);
    }

    return atomicType(`{ ${members.join(' ')} }`);
  }

  function resolveTuple(schema, prefixSchemas, additionalSchema) {
    const minimum = nonNegativeInteger(schema.minItems) ?? 0;
    const maximum = nonNegativeInteger(schema.maxItems);
    if (maximum !== undefined && maximum < minimum) return atomicType('never');

    const prefixLimit = maximum === undefined
      ? prefixSchemas.length
      : Math.min(prefixSchemas.length, maximum);
    const prefix = prefixSchemas.slice(0, prefixLimit).map(resolve);
    const requiredPrefixCount = Math.min(minimum, prefix.length);
    const members = prefix.map((type, index) => tupleMember(type, index >= requiredPrefixCount));

    const hasAdditionalItems = additionalSchema !== false;
    if (!hasAdditionalItems && minimum > prefix.length) return atomicType('never');
    if (!hasAdditionalItems || maximum === prefix.length) {
      return atomicType(`[${members.join(', ')}]`);
    }

    const additionalType = additionalSchema === undefined || additionalSchema === true
      ? atomicType('any')
      : resolve(additionalSchema);
    const requiredAdditionalCount = Math.max(0, minimum - prefix.length);
    for (let index = 0; index < requiredAdditionalCount; index += 1) {
      members.push(tupleMember(additionalType));
    }

    if (maximum === undefined) {
      members.push(`...${formatType(additionalType)}[]`);
    } else {
      const optionalCount = Math.max(0, maximum - prefix.length - requiredAdditionalCount);
      for (let index = 0; index < optionalCount; index += 1) {
        members.push(tupleMember(additionalType, true));
      }
    }

    return atomicType(`[${members.join(', ')}]`);
  }

  function resolveArray(schema) {
    if (Array.isArray(schema.prefixItems)) {
      return resolveTuple(schema, schema.prefixItems, schema.items);
    }
    if (Array.isArray(schema.items)) {
      return resolveTuple(schema, schema.items, schema.additionalItems);
    }
    if (schema.items === false) return atomicType('[]');

    const itemType = schema.items === true || schema.items === undefined
      ? atomicType('any')
      : resolve(schema.items);
    return arrayType(itemType);
  }

  function resolveDeclaredType(type, schema) {
    if (type === 'array') return resolveArray(schema);
    if (type === 'object') return resolveObject(schema);

    const primitive = PRIMITIVE_TYPES[type];
    return primitive ? atomicType(primitive, type === 'null') : atomicType('any');
  }

  function resolveStructure(schema) {
    if (Array.isArray(schema.type)) {
      return unionType(schema.type.map((type) => resolveDeclaredType(type, schema)));
    }
    if (typeof schema.type === 'string') return resolveDeclaredType(schema.type, schema);
    if (schema.properties || hasOwn(schema, 'additionalProperties') || schema.patternProperties) {
      return resolveObject(schema);
    }
    if (schema.prefixItems || hasOwn(schema, 'items')) return resolveArray(schema);
    return undefined;
  }

  function resolve(schema) {
    if (schema === true || schema === undefined || schema === null) return atomicType('any');
    if (schema === false) return atomicType('never');

    const constraints = [];
    if (schema.$ref) constraints.push(resolveReference(schema.$ref));

    if (hasOwn(schema, 'const')) {
      constraints.push(literalExpression(schema.const));
    } else if (Array.isArray(schema.enum)) {
      constraints.push(unionType(schema.enum.map(literalExpression)));
    } else {
      const structure = resolveStructure(schema);
      if (structure) constraints.push(structure);
    }

    if (Array.isArray(schema.allOf)) {
      constraints.push(intersectionType(schema.allOf.map(resolve)));
    }
    if (Array.isArray(schema.oneOf)) {
      constraints.push(unionType(schema.oneOf.map(resolve)));
    }
    if (Array.isArray(schema.anyOf)) {
      constraints.push(unionType(schema.anyOf.map(resolve)));
    }

    const type = intersectionType(constraints);
    return schema.nullable ? nullableType(type) : type;
  }

  return {
    typeOf: (schema) => resolve(schema).code,
    nullableTypeOf: (schema) => nullableType(resolve(schema)).code,
  };
}

/**
 * Resolves an OpenAPI schema to TypeScript and collects component dependencies.
 */
export function tsTypeOf(schema, dependencies, typeNames, options) {
  return createTypeResolver({dependencies, typeNames, ...options}).typeOf(schema);
}

export function nullableTsTypeOf(schema, dependencies, typeNames, options) {
  return createTypeResolver({dependencies, typeNames, ...options}).nullableTypeOf(schema);
}
