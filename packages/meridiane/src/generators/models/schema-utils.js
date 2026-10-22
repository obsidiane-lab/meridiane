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
