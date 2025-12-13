/**
 * Convertit un nom de schéma OpenAPI en un nom lisible (sans artefacts jsonld/jsonapi)
 * et intégrant les groupes (ex: Identity.jsonld-user.read -> Identity user read)
 * @param {string} original
 */
export function friendlyName(original) {
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

