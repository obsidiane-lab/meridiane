import {collectInterfaceTypeNames, resolveInterfaceSchema} from './interface-schema.js';
import {assignTypeNames, resourceTypeName, selectModelSchemas} from './model-selection.js';
import {parseOpenApiSchemaName} from './oas-schema-name.js';
import {isObject} from './schema-utils.js';
import {createTypeResolver} from './type-resolver.js';
import {quoteKeyIfNeeded} from './utils.js';

/**
 * @typedef {{
 *   requiredMode?: 'all'|'spec',
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

const JSON_LD_KEYWORDS = new Set(['@id', '@type', '@context']);

function normalizeRequiredMode(value) {
  return String(value ?? '').trim().toLowerCase() === 'spec' ? 'spec' : 'all';
}

function createModelBuilder({spec, schemas, schemaNames, typeNames, requiredMode}) {
  const knownTypeNames = new Set(typeNames.values());
  const interfaceTypeNames = collectInterfaceTypeNames(schemas, schemaNames, typeNames);

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

  /** A JSON-LD representation extends the runtime `Item`, which carries `@id`, `@type` and `@context`. */
  function buildInterface(schema, typeName, extendsTypes, isJsonLd) {
    const requiredProperties = new Set(schema.required ?? []);
    const dependencies = new Set(extendsTypes);
    const resolver = resolverFor(dependencies);

    const props = Object.entries(schema.properties ?? {})
      .filter(([propertyName]) => !isJsonLd || !JSON_LD_KEYWORDS.has(propertyName))
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

  return function buildModel(schemaName) {
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

    const isJsonLd = parseOpenApiSchemaName(schemaName).baseVariant === 'jsonld';
    return buildInterface(schema, typeName, extendsTypes, isJsonLd);
  };
}

/** TypeScript shape of a model, independent of its name and of the `Item` base. */
function signatureOf(model) {
  if (!model) return '';
  return JSON.stringify([
    model.isAlias ? model.type : null,
    model.extendsTypes,
    model.props.map(({name, type, optional}) => [name, type, optional]),
  ]);
}

/**
 * Builds TypeScript model definitions from the OpenAPI `components.schemas`.
 *
 * API Platform describes one resource several times (`Book.jsonld`, `Book`, `Book.multipart`). Representations
 * with the same shape produce a single model, built from the JSON-LD one when present.
 *
 * @param {any} spec
 * @param {BuildOptions} [options]
 * @returns {{models: ModelDefinition[]}}
 */
export function buildModelsFromOpenAPI(spec, options = {}) {
  const requiredMode = normalizeRequiredMode(options.requiredMode);
  const {schemas, schemaNames} = selectModelSchemas(spec, options);
  const builderFor = (typeNames) => createModelBuilder({spec, schemas, schemaNames, typeNames, requiredMode});

  // Representations of a resource are compared with the resource name, so references do not tell them apart.
  const buildWithResourceNames = builderFor(new Map(schemaNames.map((name) => [name, resourceTypeName(name)])));
  const signatures = new Map(schemaNames.map((name) => [name, signatureOf(buildWithResourceNames(name))]));

  const {typeNames, emitted} = assignTypeNames(schemaNames, signatures);
  const buildModel = builderFor(typeNames);

  return {models: emitted.map(buildModel).filter(Boolean)};
}
