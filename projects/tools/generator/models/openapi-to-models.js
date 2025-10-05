import {isValidTsIdentifier, sanitizeTypeName} from "./utils.js";

/**
 * @typedef {{
 *   name: string,
 *   props: Array<{ name: string, tsKey: string, type: string, optional: boolean }>,
 *   imports: string[]
 * }} ModelDefinition
 */

/**
 * Détermine si une valeur est un objet simple (non tableau)
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Ajoute des quotes sur une clé si nécessaire (clé non valide en TS)
 * @param {string} k
 */
function quoteKeyIfNeeded(k) {
  return isValidTsIdentifier(k) ? k : `'${k.replace(/'/g, "\'")}'`;
}

/**
 * Extrait le nom du schéma depuis une référence $ref
 * @param {string} $ref
 */
function schemaNameFromRef($ref) {
  const m = $ref.match(/#\/components\/schemas\/(.+)$/);
  return m ? m[1] : $ref;
}

/**
 * Essaie d'aplatir un allOf en un objet unique.
 * Ignore HydraItemBaseSchema/HydraCollectionBaseSchema quand rencontré.
 * Retourne null si l'aplatissement n'est pas possible de manière sûre.
 * @param {any[]} schemas
 * @returns {any|null}
 */
function mergeAllOf(schemas) {
  const out = {type: 'object', properties: {}, required: []};
  for (const s of schemas) {
    if (s.$ref) {
      const ref = schemaNameFromRef(s.$ref);
      if (/^Hydra(?:Item|Collection)BaseSchema$/.test(ref)) {
        continue;
      }
      return null;
    }
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

/**
 * Convertit un nom de schéma OpenAPI en un nom lisible (sans artefacts jsonld/jsonapi)
 * et intégrant les groupes (ex: Identity.jsonld-user.read -> Identity user read)
 * @param {string} original
 */
function friendlyName(original) {
  const m = original.match(/^(.*?)(?:\.(?:jsonld|jsonapi))?-(.+)$/i);
  if (m) {
    const base = m[1];
    const baseSimple = base.split('.').pop();
    const groupTokens = m[2].split('.');
    if (groupTokens.length && groupTokens[0].toLowerCase() === String(baseSimple).toLowerCase()) {
      groupTokens.shift();
    }
    const group = groupTokens.join(' ');
    return group ? `${base} ${group}` : base;
  }
  return original.replace(/\.(jsonld|jsonapi)$/ig, '');
}

/**
 * Filtre la liste des schémas à générer selon des règles métier.
 * - Exclut HydraItem/Collection base schemas
 * - Garde les noms groupés (avec `-`), sinon garde seulement les racines sans point et sans suffixe jsonld/jsonapi
 * @param {Record<string, any>} schemas
 * @returns {string[]}
 */
function filterSchemaNames(schemas) {
  // Prefer grouped variants by flavor: jsonld > none > jsonapi
  const rank = (name) => /\.jsonld\b/i.test(name) ? 3 : /\.jsonapi\b/i.test(name) ? 1 : 2;

  const roots = [];
  const grouped = new Map(); // key: "<base>|<group>" => schema name picked

  for (const n of Object.keys(schemas)) {
    if (/^Hydra(?:Item|Collection)BaseSchema$/.test(n)) continue;

    const hasGroup = n.includes('-');
    const hasDot = n.includes('.');
    const isJsonFlavor = /\.jsonld\b|\.jsonapi\b/i.test(n);

    if (!hasGroup) {
      // keep roots only if not flavored and no dots
      if (!hasDot && !isJsonFlavor) roots.push(n);
      continue;
    }

    const m = n.match(/^(.*?)(?:\.(?:jsonld|jsonapi))?-(.+)$/i);
    if (!m) {
      const curr = grouped.get(n);
      if (!curr || rank(n) > rank(curr)) grouped.set(n, n);
      continue;
    }
    const base = m[1];
    const group = m[2];
    const key = `${base}|${group}`;
    const curr = grouped.get(key);
    if (!curr || rank(n) > rank(curr)) grouped.set(key, n);
  }

  return [...roots, ...[...grouped.values()]].sort((a, b) => a.localeCompare(b));
}

/**
 * Construit une map originalName -> sanitizedName, en assurant l’unicité
 * @param {string[]} schemaNames
 */
function buildNameMap(schemaNames) {
  const used = new Set();
  const nameMap = new Map();
  for (const n of schemaNames) nameMap.set(n, sanitizeTypeName(friendlyName(n), used));
  return nameMap;
}

/**
 * Résout un schéma OpenAPI vers un type TypeScript, en collectant les dépendances ($ref)
 * @param {any} schema
 * @param {Set<string>} deps
 * @param {Map<string,string>} nameMap
 * @returns {string}
 */
function tsTypeOf(schema, deps, nameMap) {
  if (!schema) return 'any';

  if (schema.$ref) {
    const orig = schemaNameFromRef(schema.$ref);
    const name = nameMap.get(orig) || orig;
    deps.add(name);
    return name;
  }

  // If enum is present, prefer literal union (handles 3.1 enums including null)
  if (schema.enum) {
    const lit = schema.enum.map((v) => {
      if (v === null) return 'null';
      if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`;
      if (typeof v === 'number' || typeof v === 'bigint') return String(v);
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      return 'any';
    });
    // De-duplicate and join
    return [...new Set(lit)].join(' | ');
  }

  // OpenAPI 3.1: explicit null and union type arrays
  if (schema.type === 'null') return 'null';
  if (Array.isArray(schema.type)) {
    const parts = new Set();
    for (const t of schema.type) {
      if (t === 'null') {
        parts.add('null');
      } else if (t === 'string') {
        parts.add('string');
      } else if (t === 'integer' || t === 'number') {
        parts.add('number');
      } else if (t === 'boolean') {
        parts.add('boolean');
      } else if (t === 'array') {
        parts.add(tsTypeOf({ type: 'array', items: schema.items }, deps, nameMap));
      } else if (t === 'object') {
        const objTs = tsTypeOf({ type: 'object', properties: schema.properties, required: schema.required, additionalProperties: schema.additionalProperties }, deps, nameMap);
        parts.add(objTs);
      } else {
        parts.add('any');
      }
    }
    return [...parts].join(' | ');
  }

  if (schema.allOf) {
    const merged = mergeAllOf(schema.allOf);
    if (merged) return tsTypeOf(merged, deps, nameMap);
    return schema.allOf.map((s) => tsTypeOf(s, deps, nameMap)).join(' & ');
  }
  if (schema.oneOf) return schema.oneOf.map((s) => tsTypeOf(s, deps, nameMap)).join(' | ');
  if (schema.anyOf) return schema.anyOf.map((s) => tsTypeOf(s, deps, nameMap)).join(' | ');

  if (schema.type === 'array') {
    const it = tsTypeOf(schema.items || {}, deps, nameMap);
    return `${it}[]`;
  }

  if (schema.type === 'object' || (schema.properties || schema.additionalProperties)) {
    const props = schema.properties || {};
    const entries = Object.entries(props);
    const inline = entries.map(([k, v]) => {
      const t = tsTypeOf(v, deps, nameMap);
      const opt = (schema.required || []).includes(k) ? '' : '?';
      const nullable = v?.nullable && !/\|\s*null\b/.test(t) ? ' | null' : '';
      const key = quoteKeyIfNeeded(k);
      return `${key}${opt}: ${t}${nullable};`;
    });
    if (schema.additionalProperties) {
      const at = tsTypeOf(schema.additionalProperties, deps, nameMap);
      inline.push(`[key: string]: ${at};`);
    }
    return `{ ${inline.join(' ')} }`;
  }

  if (schema.enum) {
    return schema.enum.map((v) => (typeof v === 'string' ? `'${v.replace(/'/g, "\'")}'` : v)).join(' | ');
  }

  if (schema.type === 'string') return 'string';
  if (schema.type === 'integer' || schema.type === 'number') return 'number';
  if (schema.type === 'boolean') return 'boolean';

  return 'any';
}

/**
 * Construit les définitions de modèles à partir d’une spec OpenAPI (components.schemas)
 * @param {any} spec
 * @returns {{ models: ModelDefinition[] }}
 */
export function buildModelsFromOpenAPI(spec) {
  const schemas = spec?.components?.schemas || {};
  const schemaNames = filterSchemaNames(schemas);
  const nameMap = buildNameMap(schemaNames);
  const allSanitizedNames = new Set([...nameMap.values()]);

  /** @type {ModelDefinition[]} */
  const models = [];

  for (const originalName of schemaNames) {
    const raw = schemas[originalName];
    let effective = raw;
    if (raw?.allOf) {
      const merged = mergeAllOf(raw.allOf);
      if (merged) effective = merged;
    }

    const isObjectLike = effective?.type === 'object' || isObject(effective?.properties);
    if (!isObjectLike) continue;

    const sanitized = nameMap.get(originalName);
    const required = new Set(effective.required || []);
    const deps = new Set();

    const props = Object.entries(effective.properties || {}).map(([propName, prop]) => {
      const baseType = tsTypeOf(prop, deps, nameMap);
      const nullable = prop?.nullable && !/\|\s*null\b/.test(baseType) ? ' | null' : '';
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
