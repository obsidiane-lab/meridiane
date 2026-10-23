const RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
  'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import',
  'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true',
  'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'implements', 'interface',
  'package', 'private', 'protected', 'public', 'static', 'await', 'abstract', 'boolean', 'byte',
  'char', 'double', 'final', 'float', 'goto', 'int', 'long', 'native', 'short', 'synchronized',
  'throws', 'transient', 'volatile',
]);

const STRING_ESCAPES = {
  "'": "\\'",
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

export function quoteStringLiteral(value) {
  const escaped = String(value).replace(/['\\\u0000-\u001f\u2028\u2029]/g, (character) => {
    const knownEscape = STRING_ESCAPES[character];
    if (knownEscape) return knownEscape;
    return `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`;
  });
  return `'${escaped}'`;
}

/**
 * Construit un PascalCase à partir d’une liste de tokens
 * @param {string[]} tokens
 */
export function pascalCase(tokens) {
  return tokens
    .filter(Boolean)
    .map((token) => token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join('');
}

/**
 * Nettoie et désambiguïse un nom de type TypeScript, en évitant les mots réservés
 * et collisions via un suffixe numérique.
 * @param {string} original
 * @param {Set<string>} used
 */
export function sanitizeTypeName(original, used) {
  const tokens = String(original).split(/[^A-Za-z0-9]+/);
  let name = pascalCase(tokens) || 'Model';
  if (/^[0-9]/.test(name)) name = `_${name}`;
  if (RESERVED.has(name)) name = `${name}Model`;

  let unique = name;
  let suffix = 2;
  while (used.has(unique)) {
    unique = `${name}${suffix++}`;
  }
  used.add(unique);
  return unique;
}

/**
 * Vérifie qu’une clé est un identifiant TS valide ET non réservé
 * @param {string} k
 */
export function isValidTsIdentifier(k) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) && !RESERVED.has(k);
}

/**
 * Ajoute des quotes sur une clé si nécessaire (clé non valide en TS)
 * @param {string} k
 */
export function quoteKeyIfNeeded(k) {
  return isValidTsIdentifier(k) ? k : quoteStringLiteral(k);
}
