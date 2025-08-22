import {isValidTsIdentifier, sanitizeTypeName} from "./utils.js";

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}


function quoteKeyIfNeeded(k) {
  return isValidTsIdentifier(k) ? k : `'${k.replace(/'/g, "\'")}'`;
}

function schemaNameFromRef($ref) {
  const m = $ref.match(/#\/components\/schemas\/(.+)$/);
  return m ? m[1] : $ref;
}

function mergeAllOf(schemas) {
  const out = {type: 'object', properties: {}, required: []};
  for (const s of schemas) {
    if (s.$ref) return null;
    if (s.type === 'object') {
      Object.assign(out.properties, s.properties || {});
      if (Array.isArray(s.required)) out.required.push(...s.required);
    } else {
      return null;
    }
  }
  out.required = [...new Set(out.required)];
  return out;
}

export function buildModelsFromOpenAPI(spec) {
  const schemas = spec?.components?.schemas || {};
  const origNames = Object
    .keys(schemas)
    .filter(n => !n.includes('.'))
    .filter(n => !/jsonld/i.test(n))
    .sort((a, b) => a.localeCompare(b));

  const used = new Set();
  const nameMap = new Map(); // original → sanitized
  for (const n of origNames) nameMap.set(n, sanitizeTypeName(n, used));

  // Résolveur de type avec collecte de deps
  function tsTypeOf(schema, deps) {
    if (!schema) return 'any';

    if (schema.$ref) {
      const orig = schemaNameFromRef(schema.$ref);
      const name = nameMap.get(orig) || orig;
      // On enregistre la dépendance (elle sera filtrée plus tard)
      if (deps) deps.add(name);
      return name;
    }

    if (schema.allOf) {
      const merged = mergeAllOf(schema.allOf);
      if (merged) return tsTypeOf(merged, deps);
      return schema.allOf.map((s) => tsTypeOf(s, deps)).join(' & ');
    }
    if (schema.oneOf) return schema.oneOf.map((s) => tsTypeOf(s, deps)).join(' | ');
    if (schema.anyOf) return schema.anyOf.map((s) => tsTypeOf(s, deps)).join(' | ');

    if (schema.type === 'array') {
      const it = tsTypeOf(schema.items || {}, deps);
      return `${it}[]`;
    }

    if (schema.type === 'object' || (schema.properties || schema.additionalProperties)) {
      const props = schema.properties || {};
      const entries = Object.entries(props);
      const inline = entries.map(([k, v]) => {
        const t = tsTypeOf(v, deps);
        const opt = (schema.required || []).includes(k) ? '' : '?';
        const nullable = v?.nullable ? ' | null' : '';
        const key = quoteKeyIfNeeded(k);
        return `${key}${opt}: ${t}${nullable};`;
      });
      if (schema.additionalProperties) {
        const at = tsTypeOf(schema.additionalProperties, deps);
        inline.push(`[key: string]: ${at};`);
      }
      return `{ ${inline.join(' ')} }`;
    }

    if (schema.enum) {
      return schema.enum.map((v) => (typeof v === 'string' ? `'${v.replace(/'/g, "\'")}'` : v)).join(' | ');
    }

    if (schema.type === 'string') {
      if (schema.format === 'date-time' || schema.format === 'date') return 'Date';
      return 'string';
    }
    if (schema.type === 'integer' || schema.type === 'number') return 'number';
    if (schema.type === 'boolean') return 'boolean';

    return 'any';
  }

  const allSanitizedNames = new Set([...nameMap.values()]);

  const models = [];
  for (const origName of origNames) {
    const s = schemas[origName];
    let effective = s;
    if (s?.allOf) {
      const merged = mergeAllOf(s.allOf);
      if (merged) effective = merged;
    }

    const isObjectLike = effective?.type === 'object' || isObject(effective?.properties);
    if (!isObjectLike) continue;

    const sanitized = nameMap.get(origName);
    const required = new Set(effective.required || []);
    const deps = new Set();

    const props = Object.entries(effective.properties || {}).map(([propName, prop]) => {
      const baseType = tsTypeOf(prop, deps);
      const nullable = prop?.nullable ? ' | null' : '';
      const type = baseType + nullable;
      return {
        name: propName,
        tsKey: quoteKeyIfNeeded(propName),
        type,
        optional: !required.has(propName),
      };
    });

    // Construire la liste d'import: uniquement les autres modèles connus, exclure soi-même et les builtins
    const imports = [...deps]
      .filter((n) => n !== sanitized)
      .filter((n) => allSanitizedNames.has(n))
      .sort((a, b) => a.localeCompare(b));

    models.push({name: sanitized, props, imports});
  }

  return {models};
}
