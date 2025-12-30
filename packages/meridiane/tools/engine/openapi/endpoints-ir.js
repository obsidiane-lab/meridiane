import { canonicalizeMediaType } from './oas-contract.js';
import { typeIrOf } from './type-ir.js';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

function normalizeFormats(formats) {
  const normalized = [];
  for (const f of Array.isArray(formats) ? formats : []) {
    const canon = canonicalizeMediaType(f);
    if (!canon) continue;
    if (!normalized.includes(canon)) normalized.push(canon);
  }
  return normalized;
}

function mergeParameters(pathParams, opParams) {
  const out = new Map();
  for (const p of [...(pathParams || []), ...(opParams || [])]) {
    if (!p || !p.name || !p.in) continue;
    const key = `${p.in}:${p.name}`;
    out.set(key, p);
  }
  return [...out.values()];
}

export function buildEndpointsIR(spec, options) {
  const opts = options || {};
  const nameMap = opts.nameMap || new Map();
  const formats = normalizeFormats(opts.formats);
  const useFormats = formats.length > 0 ? formats : undefined;

  const out = [];
  const paths = spec?.paths || {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    const pathParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op) continue;

      const params = mergeParameters(pathParams, op.parameters);
      const query = params
        .filter((p) => p.in === 'query')
        .map((p) => ({
          name: p.name,
          required: !!p.required,
          schema: p.schema ? typeIrOf(p.schema, new Set(), nameMap, {}) : { kind: 'any' },
        }));

      const requestBody = op.requestBody;
      let requestBodyOut;
      if (requestBody && requestBody.content) {
        const content = [];
        for (const [contentType, body] of Object.entries(requestBody.content)) {
          const canon = canonicalizeMediaType(contentType);
          if (useFormats && canon && !useFormats.includes(canon)) continue;
          const schema = body?.schema;
          const type = schema ? typeIrOf(schema, new Set(), nameMap, {}) : { kind: 'any' };
          content.push({ contentType, type });
        }
        if (content.length > 0) {
          requestBodyOut = { required: !!requestBody.required, content };
        }
      }

      const responsesOut = [];
      const responses = op.responses || {};
      for (const [status, response] of Object.entries(responses)) {
        if (!response || typeof response !== 'object') continue;
        const content = response.content || {};
        const entries = Object.entries(content);
        if (entries.length === 0) {
          responsesOut.push({ status: String(status) });
          continue;
        }
        for (const [contentType, body] of entries) {
          const canon = canonicalizeMediaType(contentType);
          if (useFormats && canon && !useFormats.includes(canon)) continue;
          const schema = body?.schema;
          const type = schema ? typeIrOf(schema, new Set(), nameMap, {}) : { kind: 'any' };
          responsesOut.push({ status: String(status), contentType, type });
        }
      }

      out.push({
        method: method.toUpperCase(),
        path,
        operationId: op.operationId || undefined,
        query,
        requestBody: requestBodyOut,
        responses: responsesOut,
      });
    }
  }

  return out;
}
