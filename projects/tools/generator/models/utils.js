import fs from 'node:fs/promises';

/**
 * Supprime et recrée un dossier (idempotent)
 * @param {string} dir
 */
export async function ensureCleanDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

const RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static', 'await', 'abstract', 'boolean', 'byte', 'char', 'double', 'final', 'float', 'goto', 'int', 'long', 'native', 'short', 'synchronized', 'throws', 'transient', 'volatile'
]);

/**
 * Construit un PascalCase à partir d’une liste de tokens
 * @param {string[]} tokens
 */
export function pascalCase(tokens) {
  return tokens
    .filter(Boolean)
    .map(t => t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
    .filter(Boolean)
    .map(t => t.charAt(0).toUpperCase() + t.slice(1))
    .join('');
}

/**
 * Nettoie et désambiguïse un nom de type TypeScript, en évitant les mots réservés
 * et collisions via un suffixe numérique.
 * @param {string} original
 * @param {Set<string>} used
 */
export function sanitizeTypeName(original, used) {
  const base = original.includes('.') ? original.split('.').pop() : original;
  const tokens = base.split(/[^A-Za-z0-9]+/);
  let name = pascalCase(tokens) || 'Model';
  if (/^[0-9]/.test(name)) name = '_' + name;
  if (RESERVED.has(name)) name = name + 'Model';
  let unique = name, i = 2;
  while (used.has(unique)) {
    unique = name + i++;
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
