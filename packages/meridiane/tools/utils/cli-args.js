/**
 * @param {string} name
 * @param {string|undefined} def
 * @param {string[]} [argv]
 * @returns {string|undefined}
 */
export function getArg(name, def, argv = process.argv) {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : def;
}

/**
 * @param {string} name
 * @param {string[]} [argv]
 * @returns {string[]}
 */
export function getArgs(name, argv = process.argv) {
  return argv
    .filter((x) => x.startsWith(`--${name}=`))
    .map((x) => x.slice(`--${name}=`.length));
}

/**
 * @param {string} name
 * @param {string[]} [argv]
 */
export function hasFlag(name, argv = process.argv) {
  return argv.includes(`--${name}`);
}

/**
 * @param {unknown} v
 * @param {boolean} def
 */
export function asBool(v, def) {
  if (typeof v !== 'string') return def;
  if (/^(1|true|yes)$/i.test(v)) return true;
  if (/^(0|false|no)$/i.test(v)) return false;
  return def;
}

