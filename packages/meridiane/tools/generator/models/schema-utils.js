/** Hydra base schemas to ignore in merges and filtering */
const DEFAULT_HYDRA_BASE_RE = /^Hydra(?:Item|Collection)BaseSchema$/;

/**
 * Récupère la RegExp Hydra à partir d'une config optionnelle.
 * @param {{ hydraBaseRegex?: RegExp|string }} [cfg]
 */
function hydraRe(cfg) {
  const r = cfg?.hydraBaseRegex;
  if (!r) return DEFAULT_HYDRA_BASE_RE;
  if (r instanceof RegExp) return r;
  try { return new RegExp(r); } catch { return DEFAULT_HYDRA_BASE_RE; }
}

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
export function mergeAllOf(schemas, cfg) {
  const out = {type: 'object', properties: {}, required: []};
  for (const s of schemas) {
    if (s.$ref) {
      const ref = schemaNameFromRef(s.$ref);
      if (hydraRe(cfg).test(ref)) {
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
export function filterSchemaNames(schemas, cfg) {
  const prefer = (cfg?.preferFlavor === 'jsonapi') ? ['jsonapi','none','jsonld']
               : (cfg?.preferFlavor === 'none') ? ['none','jsonld','jsonapi']
               : ['jsonld','none','jsonapi']; // default jsonld
  const flavorOf = (name) => /\.jsonld\b/i.test(name) ? 'jsonld' : /\.jsonapi\b/i.test(name) ? 'jsonapi' : 'none';
  const rank = (name) => 3 - prefer.indexOf(flavorOf(name));

  const roots = [];
  const grouped = new Map();
  const variantsNoGroup = new Map(); // base -> best variant (no '-')

  for (const n of Object.keys(schemas)) {
    if (hydraRe(cfg).test(n)) continue;

    const hasGroup = n.includes('-');
    const hasDot = n.includes('.');
    const isJsonFlavor = /\.jsonld\b|\.jsonapi\b/i.test(n);

    if (!hasGroup) {
      // Cas 1: racine simple (pas de point, pas de variante jsonld/jsonapi)
      if (!hasDot && !isJsonFlavor) {
        roots.push(n);
        continue;
      }
      // Cas 2: variante jsonld/jsonapi sans groupe (ex: Workflow.WorkflowInput.jsonld ou Foo.jsonld)
      if (isJsonFlavor) {
        const base = n.replace(/\.(jsonld|jsonapi)\b/i, '');
        // Si une base "pure" existe dans la spec, on préfère l’ignorer pour éviter les doublons
        if (Object.prototype.hasOwnProperty.call(schemas, base)) {
          continue;
        }
        const curr = variantsNoGroup.get(base);
        if (!curr || rank(n) > rank(curr)) variantsNoGroup.set(base, n);
        continue;
      }
      // Cas 3: nom avec point mais sans suffixe jsonld/jsonapi et sans group — on le considère tel quel
      variantsNoGroup.set(n, n);
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
  // Ajoute les variantes sans groupe sélectionnées
  const noGroupSelected = [...variantsNoGroup.values()];
  return [...roots, ...[...grouped.values()], ...noGroupSelected].sort((a, b) => a.localeCompare(b));
}
