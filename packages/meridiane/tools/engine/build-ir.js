import { buildModelsIR } from './openapi/models-ir.js';
import { buildEndpointsIR } from './openapi/endpoints-ir.js';

export function buildBridgeIR(spec, options) {
  const { requiredMode, formats, include, exclude } = options || {};
  const modelsResult = buildModelsIR(spec, {
    requiredMode,
    formats,
    includeSchemaNames: include,
    excludeSchemaNames: exclude,
  });

  const endpoints = buildEndpointsIR(spec, {
    formats: modelsResult.formats,
    nameMap: modelsResult.nameMap,
  });

  return {
    irVersion: 1,
    formats: modelsResult.formats,
    requiredMode: modelsResult.requiredMode,
    models: modelsResult.models,
    endpoints,
  };
}
