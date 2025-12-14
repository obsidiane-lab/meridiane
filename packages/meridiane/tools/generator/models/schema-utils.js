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
 * Liste les noms de schémas dans `components.schemas`.
 * La sélection/filtres est gérée par `applySchemaNameFilters`.
 * @param {Record<string, any>} schemas
 * @returns {string[]}
 */
export function filterSchemaNames(schemas, cfg) {
  return Object.keys(schemas).sort((a, b) => a.localeCompare(b));
}

/**
 * @param {unknown} rule
 * @returns {rule is ((name: string) => boolean)}
 */
function isRuleFn(rule) {
  return typeof rule === 'function';
}

/**
 * @param {string} name
 * @param {RegExp|string|((name: string) => boolean)} rule
 */
function matchesRule(name, rule) {
  if (rule instanceof RegExp) return rule.test(name);
  if (isRuleFn(rule)) return !!rule(name);
  if (typeof rule === 'string' && rule.length) return name.includes(rule);
  return false;
}

/**
 * Applique un preset de génération et/ou des règles include/exclude.
 *
 * - `preset: "all"`: ne filtre rien (comportement par défaut)
 * - `preset: "native"`: retire les schémas "techniques" (Hydra*, jsonMergePatch…)
 *
 * Les règles `includeSchemaNames` / `excludeSchemaNames` s'appliquent sur les noms
 * de schémas OpenAPI (ex: "User-user.read", "Conversation.jsonMergePatch", …).
 *
 * @param {string[]} schemaNames
 * @param {{
 *   preset?: 'all'|'native',
 *   includeSchemaNames?: Array<RegExp|string|((name: string) => boolean)>,
 *   excludeSchemaNames?: Array<RegExp|string|((name: string) => boolean)>,
 * }} [cfg]
 */
export function applySchemaNameFilters(schemaNames, cfg) {
  const preset = cfg?.preset ?? 'all';

  /** @type {Array<RegExp|string|((name: string) => boolean)>} */
  const include = Array.isArray(cfg?.includeSchemaNames) ? cfg.includeSchemaNames : [];
  /** @type {Array<RegExp|string|((name: string) => boolean)>} */
  const exclude = Array.isArray(cfg?.excludeSchemaNames) ? [...cfg.excludeSchemaNames] : [];

  // 1) include/exclude user filters (always applied first)
  const hasInclude = include.length > 0;
  let out = schemaNames.filter((name) => {
    if (hasInclude && !include.some((r) => matchesRule(name, r))) return false;
    if (exclude.some((r) => matchesRule(name, r))) return false;
    return true;
  });

  // 2) preset filters
  if (preset === 'native') {
    out = out
      .filter((n) => !/^Hydra/i.test(n))
      // API Platform adds a technical "Multipart" schema for multipart/form-data request bodies (file uploads).
      // It's not a resource model and tends to pollute the generated "native" model list.
      .filter((n) => !/^Multipart(?:$|[.-])/i.test(n))
      .filter((n) => !/jsonMergePatch/i.test(n))
      .filter((n) => !/\.jsonld\b/i.test(n))
      .filter((n) => !/\.jsonapi\b/i.test(n));

    // 3) collapse group variants: keep one schema per base (before `-`)
    const score = (name) => {
      if (!name.includes('-')) return 100;
      const group = name.split('-').slice(1).join('-');
      if (/(^|[.\-])read($|[.\-])/i.test(group)) return 50;
      return 0;
    };
    const byBase = new Map();
    for (const name of out) {
      const base = name.split('-')[0];
      const prev = byBase.get(base);
      if (!prev) {
        byBase.set(base, name);
        continue;
      }
      const a = prev, b = name;
      const sa = score(a), sb = score(b);
      if (sb > sa) byBase.set(base, b);
      else if (sb === sa && b.localeCompare(a) < 0) byBase.set(base, b);
    }
    out = [...byBase.values()].sort((a, b) => a.localeCompare(b));
  }

  return out;
}
