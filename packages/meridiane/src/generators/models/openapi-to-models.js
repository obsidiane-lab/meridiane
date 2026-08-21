import {canonicalizeMediaType} from './oas-contract.js';
import {collectInterfaceTypeNames, resolveInterfaceSchema} from './interface-schema.js';
import {DEFAULT_MODEL_FORMAT, selectModelSchemas} from './model-selection.js';
import {isObject} from './schema-utils.js';
import {createTypeResolver} from './type-resolver.js';
import {quoteKeyIfNeeded} from './utils.js';

/**
 * @typedef {{
 *   requiredMode?: 'all'|'spec',
 *   formats?: string[],
 *   includeSchemaNames?: Array<RegExp|string|((name: string) => boolean)>,
 *   excludeSchemaNames?: Array<RegExp|string|((name: string) => boolean)>,
 * }} BuildOptions
 */

/** @typedef {{name: string, tsKey: string, type: string, optional: boolean}} ModelProp */

/**
 * @typedef {{
 *   name: string,
 *   props: ModelProp[],
 *   imports: string[],
 *   extendsTypes: string[],
 *   extendsItem?: boolean,
 *   isAlias?: boolean,
 *   type?: string,
 * }} ModelDefinition
 */

function normalizeRequiredMode(value) {
  return String(value ?? '').trim().toLowerCase() === 'spec' ? 'spec' : 'all';
}

function createModelBuilder({spec, schemas, typeNames, interfaceTypeNames, requiredMode}) {
  const knownTypeNames = new Set(typeNames.values());

  function importsFor(dependencies, currentTypeName) {
    return [...dependencies]
      .filter((dependency) => dependency !== currentTypeName && knownTypeNames.has(dependency))
      .sort((left, right) => left.localeCompare(right));
  }

  function resolverFor(dependencies) {
    return createTypeResolver({dependencies, typeNames, requiredMode, spec});
  }

  function buildAlias(raw, typeName) {
    const dependencies = new Set();
    const type = resolverFor(dependencies).typeOf(raw);
    return {
      name: typeName,
      type,
      imports: importsFor(dependencies, typeName),
      isAlias: true,
      props: [],
      extendsTypes: [],
    };
  }

  function buildInterface(schema, typeName, extendsTypes, preferredFormat) {
    const isJsonLd = canonicalizeMediaType(preferredFormat) === DEFAULT_MODEL_FORMAT;
    const requiredProperties = new Set(schema.required ?? []);
    const dependencies = new Set(extendsTypes);
    const resolver = resolverFor(dependencies);

    const props = Object.entries(schema.properties ?? {})
      .filter(([propertyName]) => !isJsonLd || !['@id', '@type', '@context'].includes(propertyName))
      .map(([propertyName, propertySchema]) => ({
        name: propertyName,
        tsKey: quoteKeyIfNeeded(propertyName),
        type: requiredMode === 'spec'
          ? resolver.typeOf(propertySchema)
          : resolver.nullableTypeOf(propertySchema),
        optional: requiredMode === 'spec' ? !requiredProperties.has(propertyName) : true,
      }));

    return {
      name: typeName,
      props,
      imports: importsFor(dependencies, typeName),
      extendsTypes,
      extendsItem: isJsonLd,
    };
  }

  return function buildModel(schemaName, preferredFormat) {
    const raw = schemas[schemaName];
    const typeName = typeNames.get(schemaName);
    if (!typeName || raw === undefined) return undefined;

    const {schema, extendsTypes, compatible} = resolveInterfaceSchema(
      raw,
      typeName,
      typeNames,
      interfaceTypeNames
    );
    const isObjectLike = schema?.type === 'object' || isObject(schema?.properties) || extendsTypes.length > 0;
    if (!compatible || !isObjectLike || !interfaceTypeNames.has(typeName)) {
      return buildAlias(raw, typeName);
    }

    return buildInterface(schema, typeName, extendsTypes, preferredFormat);
  };
}

/**
 * Builds TypeScript model definitions from OpenAPI `components.schemas`.
 * @param {any} spec
 * @param {BuildOptions} [options]
 * @returns {{models: ModelDefinition[]}}
 */
export function buildModelsFromOpenAPI(spec, options = {}) {
  const requiredMode = normalizeRequiredMode(options.requiredMode);
  const {schemas, formats, schemaNames, preferredFormats, typeNames} = selectModelSchemas(
    spec,
    options
  );
  const interfaceTypeNames = collectInterfaceTypeNames(schemas, schemaNames, typeNames);
  const buildModel = createModelBuilder({
    spec,
    schemas,
    typeNames,
    interfaceTypeNames,
    requiredMode,
  });

  const models = [];
  for (const schemaName of schemaNames) {
    const preferredFormat = preferredFormats.get(schemaName) ?? formats[0];
    const model = buildModel(schemaName, preferredFormat);
    if (model) models.push(model);
  }

  return {models};
}
