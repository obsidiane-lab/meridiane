/** Hydra base schemas to ignore in safe `allOf` merges */
const HYDRA_BASE_RE = /^Hydra(?:Item|Collection)BaseSchema$/;

/**
 * Détermine si une valeur est un objet simple (non tableau)
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
export function isObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function decodeJsonPointerSegment(segment) {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function resolveLocalRef(document, ref) {
  const pointer = String(ref ?? '');
  if (pointer === '#') return document;
  if (!pointer.startsWith('#/')) return undefined;

  let current = document;
  for (const segment of pointer.slice(2).split('/').map(decodeJsonPointerSegment)) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * Extrait le nom du schéma depuis une référence $ref
 * @param {string} $ref
 * @returns {string|undefined}
 */
export function schemaNameFromRef($ref) {
  const match = String($ref ?? '').match(/^#\/components\/schemas\/([^/]+)$/);
  return match ? decodeJsonPointerSegment(match[1]) : undefined;
}

/**
 * Essaie d'aplatir un allOf en un objet unique.
 * Ignore HydraItemBaseSchema/HydraCollectionBaseSchema quand rencontré.
 * Retourne null si l'aplatissement n'est pas possible de manière sûre.
 * @param {any[]} schemas
 * @returns {any|null}
 */
export function mergeAllOf(schemas) {
  const out = {type: 'object', properties: {}, required: []};
  for (const s of schemas) {
    if (s.$ref) {
      const ref = schemaNameFromRef(s.$ref);
      if (ref && HYDRA_BASE_RE.test(ref)) {
        continue;
      }
      return null;
    }
    if (s.type === 'object') {
      for (const [name, property] of Object.entries(s.properties ?? {})) {
        if (hasOwn(out.properties, name)) return null;
        out.properties[name] = property;
      }
      if (Array.isArray(s.required)) out.required.push(...s.required);
    } else {
      return null;
    }
  }
  out.required = [...new Set(out.required)];
  return out;
}
