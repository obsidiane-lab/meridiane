/** Hydra base schemas to ignore in merges and filtering */
export const HYDRA_BASE_RE = /^Hydra(?:Item|Collection)BaseSchema$/;

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
 */
export function schemaNameFromRef($ref) {
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
export function mergeAllOf(schemas) {
  const out = {type: 'object', properties: {}, required: []};
  for (const s of schemas) {
    if (s.$ref) {
      const ref = schemaNameFromRef(s.$ref);
      if (HYDRA_BASE_RE.test(ref)) {
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
 * Filtre et déduplique les noms de schémas à générer.
 * Préférence entre variantes: jsonld > none > jsonapi.
 * - Exclut HydraItem/Collection base schemas
 * - Garde les noms groupés (avec `-`) en choisissant la meilleure variante
 * - Garde les racines sans point et sans suffixe jsonld/jsonapi
 * @param {Record<string, any>} schemas
 * @returns {string[]}
 */
export function filterSchemaNames(schemas) {
  const rank = (name) => /\.jsonld\b/i.test(name) ? 3 : /\.jsonapi\b/i.test(name) ? 1 : 2;

  const roots = [];
  const grouped = new Map();

  for (const n of Object.keys(schemas)) {
    if (HYDRA_BASE_RE.test(n)) continue;

    const hasGroup = n.includes('-');
    const hasDot = n.includes('.');
    const isJsonFlavor = /\.jsonld\b|\.jsonapi\b/i.test(n);

    if (!hasGroup) {
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

