/**
 * Construit un label "tokenisé" (sans `.` ni `-`) à partir d'un nom de schéma OpenAPI.
 * Le label est ensuite passé à `sanitizeTypeName()` pour produire un identifiant TS stable.
 *
 * @param {string} original
 * @param {{ preset: 'all'|'native' }} cfg
 */
export function schemaLabel(original, cfg) {
  const preset = cfg?.preset ?? 'all';
  if (preset === 'native') {
    // En native, on vise un nom "entity-like" : on ignore le groupe (après `-`) si présent.
    // Les variantes .jsonld/.jsonapi/jsonMergePatch sont censées être filtrées par le preset.
    return String(original).split('-')[0];
  }

  // En all, on encode tout : `.` et `-` deviennent des séparateurs de tokens.
  const rawTokens = String(original).split(/[.-]/g).filter(Boolean);
  const tokens = rawTokens.map((t) => {
    const lower = t.toLowerCase();
    if (lower === 'jsonld') return 'Jsonld';
    if (lower === 'jsonapi') return 'Jsonapi';
    if (lower === 'jsonmergepatch' || t === 'jsonMergePatch') return 'JsonMergePatch';
    return t;
  });
  return tokens.join(' ');
}
