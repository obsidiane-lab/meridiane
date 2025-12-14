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

/**
 * Extrait le nom du schéma depuis une référence $ref
 * @param {string} $ref
 * @returns {string|undefined}
 */
export function schemaNameFromRef($ref) {
  const m = $ref.match(/#\/components\/schemas\/(.+)$/);
  return m ? m[1] : undefined;
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
      Object.assign(out.properties, s.properties || {});
      if (Array.isArray(s.required)) out.required.push(...s.required);
    } else {
      return null;
    }
  }
  out.required = [...new Set(out.required)];
  return out;
}
