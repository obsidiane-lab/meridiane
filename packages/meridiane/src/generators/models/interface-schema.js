import {hasOwn, isObject, mergeAllOf, schemaNameFromRef} from './schema-utils.js';

function hasPropertyConflict(left, right) {
  return Object.keys(right).some((propertyName) => hasOwn(left, propertyName));
}

/**
 * Finds component schemas that can be emitted as TypeScript interfaces without
 * losing schema semantics. Other schemas are emitted as type aliases.
 */
export function collectInterfaceTypeNames(schemas, schemaNames, typeNames) {
  const results = new Map();
  const visiting = new Set();

  function isInterfaceSchema(schema) {
    if (!isObject(schema)) return false;
    if (
      schema.$ref || schema.nullable || hasOwn(schema, 'const') || Array.isArray(schema.enum) ||
      Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf) || schema.patternProperties ||
      (hasOwn(schema, 'additionalProperties') && schema.additionalProperties !== false)
    ) {
      return false;
    }

    const declaresObject = schema.type === 'object' || isObject(schema.properties);
    if (schema.type && schema.type !== 'object') return false;
    if (!Array.isArray(schema.allOf)) return declaresObject;

    const hasOnlyObjectParts = schema.allOf.every((part) => {
      if (!part?.$ref) return isInterfaceSchema(part);
      const referencedName = schemaNameFromRef(part.$ref);
      return referencedName ? isNamedInterface(referencedName) : false;
    });
    return hasOnlyObjectParts && (declaresObject || schema.allOf.length > 0);
  }

  function isNamedInterface(schemaName) {
    if (results.has(schemaName)) return results.get(schemaName);
    if (visiting.has(schemaName)) return true;

    visiting.add(schemaName);
    const result = isInterfaceSchema(schemas[schemaName]);
    visiting.delete(schemaName);
    results.set(schemaName, result);
    return result;
  }

  return new Set(
    schemaNames
      .filter(isNamedInterface)
      .map((schemaName) => typeNames.get(schemaName))
      .filter(Boolean)
  );
}

/**
 * Flattens object-only allOf parts and keeps component references as interface
 * inheritance. Unsafe or conflicting compositions fall back to a type alias.
 */
export function resolveInterfaceSchema(raw, currentTypeName, typeNames, interfaceTypeNames) {
  if (!raw?.allOf) return {schema: raw, extendsTypes: [], compatible: true};

  const merged = mergeAllOf(raw.allOf);
  if (merged) {
    const ownProperties = raw.properties ?? {};
    if (hasPropertyConflict(merged.properties, ownProperties)) {
      return {schema: raw, extendsTypes: [], compatible: false};
    }

    return {
      schema: {
        ...merged,
        properties: {...ownProperties, ...merged.properties},
        required: [...new Set([...(raw.required ?? []), ...merged.required])],
      },
      extendsTypes: [],
      compatible: true,
    };
  }

  const properties = {...(raw.properties ?? {})};
  const required = new Set(raw.required ?? []);
  const inheritedTypes = new Set();

  for (const part of raw.allOf) {
    if (part?.$ref) {
      const referencedSchema = schemaNameFromRef(part.$ref);
      if (!referencedSchema || /^Hydra/i.test(referencedSchema)) continue;

      const referencedType = typeNames.get(referencedSchema) ?? referencedSchema;
      if (referencedType === currentTypeName) continue;
      if (!interfaceTypeNames.has(referencedType)) {
        return {schema: raw, extendsTypes: [], compatible: false};
      }
      inheritedTypes.add(referencedType);
      continue;
    }

    if (part?.type !== 'object' && !isObject(part?.properties)) {
      return {schema: raw, extendsTypes: [], compatible: false};
    }

    const partProperties = part.properties ?? {};
    if (hasPropertyConflict(properties, partProperties)) {
      return {schema: raw, extendsTypes: [], compatible: false};
    }
    Object.assign(properties, partProperties);
    for (const property of part.required ?? []) required.add(property);
  }

  return {
    schema: {type: 'object', properties, required: [...required]},
    extendsTypes: [...inheritedTypes].sort((left, right) => left.localeCompare(right)),
    compatible: true,
  };
}
