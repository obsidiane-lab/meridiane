import { schemaNameFromRef } from './schema-utils.js';

function isNullType(t) {
  return t?.kind === 'null';
}

function typeKey(t) {
  if (!t || typeof t !== 'object') return String(t);
  if (t.kind === 'literal') return `literal:${typeof t.value}:${String(t.value)}`;
  if (t.kind === 'ref') return `ref:${t.name}`;
  if (t.kind === 'array') return `array:${typeKey(t.items)}`;
  if (t.kind === 'map') return `map:${typeKey(t.values)}`;
  if (t.kind === 'union') return `union:${t.types.map(typeKey).sort().join('|')}`;
  if (t.kind === 'intersection') return `intersection:${t.types.map(typeKey).sort().join('&')}`;
  if (t.kind === 'object') {
    const props = Array.isArray(t.props) ? t.props : [];
    const propKeys = props.map((p) => `${p.name}:${typeKey(p.type)}:${p.optional ? 'opt' : 'req'}`).sort();
    const add = t.additionalProperties ? `|add:${typeKey(t.additionalProperties)}` : '';
    return `object:${propKeys.join(',')}${add}`;
  }
  return t.kind || 'unknown';
}

function uniqTypes(types) {
  const seen = new Set();
  const out = [];
  for (const t of types) {
    const key = typeKey(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function ensureNullableType(type) {
  if (isNullType(type)) return type;
  if (type?.kind === 'union') {
    const hasNull = type.types.some((t) => isNullType(t));
    return hasNull ? type : { kind: 'union', types: uniqTypes([...type.types, { kind: 'null' }]) };
  }
  return { kind: 'union', types: uniqTypes([type, { kind: 'null' }]) };
}

export function withNullableType(type, schema) {
  return schema?.nullable ? ensureNullableType(type) : type;
}

function literalType(value) {
  if (value === null) return { kind: 'null' };
  return { kind: 'literal', value };
}

export function typeIrOf(schema, deps, nameMap, cfg) {
  if (!schema) return { kind: 'any' };
  const requiredMode = cfg?.requiredMode ?? 'all';
  const forceNullable = requiredMode !== 'spec';

  if (schema.$ref) {
    const orig = schemaNameFromRef(schema.$ref);
    if (!orig) return { kind: 'any' };
    if (/jsonMergePatch/i.test(orig)) return { kind: 'any' };
    if (/^Hydra/i.test(orig)) return { kind: 'any' };
    const name = nameMap.get(orig) || orig;
    deps.add(name);
    return { kind: 'ref', name };
  }

  if (schema.enum) {
    const literals = schema.enum.map((v) => literalType(v));
    return literals.length === 1 ? literals[0] : { kind: 'union', types: uniqTypes(literals) };
  }

  if (schema.type === 'null') return { kind: 'null' };

  if (Array.isArray(schema.type)) {
    const parts = [];
    for (const t of schema.type) {
      if (t === 'null') parts.push({ kind: 'null' });
      else if (t === 'string') parts.push({ kind: 'string' });
      else if (t === 'integer' || t === 'number') parts.push({ kind: 'number' });
      else if (t === 'boolean') parts.push({ kind: 'boolean' });
      else if (t === 'array') parts.push(typeIrOf({ type: 'array', items: schema.items }, deps, nameMap, cfg));
      else if (t === 'object') {
        parts.push(
          typeIrOf(
            { type: 'object', properties: schema.properties, required: schema.required, additionalProperties: schema.additionalProperties },
            deps,
            nameMap,
            cfg
          )
        );
      } else parts.push({ kind: 'any' });
    }
    return parts.length === 1 ? parts[0] : { kind: 'union', types: uniqTypes(parts) };
  }

  if (schema.allOf) {
    const parts = schema.allOf.map((s) => typeIrOf(s, deps, nameMap, cfg));
    return parts.length === 1 ? parts[0] : { kind: 'intersection', types: uniqTypes(parts) };
  }
  if (schema.oneOf) {
    const parts = schema.oneOf.map((s) => typeIrOf(s, deps, nameMap, cfg));
    return parts.length === 1 ? parts[0] : { kind: 'union', types: uniqTypes(parts) };
  }
  if (schema.anyOf) {
    const parts = schema.anyOf.map((s) => typeIrOf(s, deps, nameMap, cfg));
    return parts.length === 1 ? parts[0] : { kind: 'union', types: uniqTypes(parts) };
  }

  if (schema.type === 'array') {
    const it = typeIrOf(schema.items || {}, deps, nameMap, cfg);
    return { kind: 'array', items: it };
  }

  if (schema.type === 'object' || schema.properties || schema.additionalProperties) {
    const props = schema.properties || {};
    const required = new Set(schema.required || []);
    const outProps = Object.entries(props).map(([k, v]) => {
      const base = typeIrOf(v, deps, nameMap, cfg);
      const wantsNull = forceNullable || v?.nullable;
      const type = wantsNull ? ensureNullableType(base) : base;
      const optional = requiredMode === 'spec' ? !required.has(k) : true;
      return { name: k, optional, type };
    });
    let additionalProperties;
    if (schema.additionalProperties) {
      if (schema.additionalProperties === true) additionalProperties = { kind: 'any' };
      else additionalProperties = typeIrOf(schema.additionalProperties, deps, nameMap, cfg);
    }
    return { kind: 'object', props: outProps, additionalProperties };
  }

  if (schema.type === 'string') return { kind: 'string' };
  if (schema.type === 'integer' || schema.type === 'number') return { kind: 'number' };
  if (schema.type === 'boolean') return { kind: 'boolean' };

  return { kind: 'any' };
}
