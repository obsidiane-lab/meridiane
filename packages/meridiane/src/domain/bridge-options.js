import { deriveLibName } from './lib-name.js';
import {splitListArgs} from './list-values.js';

/** Normalizes the arguments of `generate`, `build` and `dev` into one configuration. */
export function normalizeOptions(packageName, opts = {}) {
  const normalizedPackageName = String(packageName ?? '').trim();

  return {
    packageName: normalizedPackageName,
    libName: deriveLibName(normalizedPackageName),
    version: (typeof opts.version === 'string' && opts.version.trim()) || '0.0.0',
    specSource: opts.spec,
    include: splitListArgs(opts.include),
    exclude: splitListArgs(opts.exclude),
    noModels: opts.models === false,
    debug: !!opts.debug,
    outDir: typeof opts.out === 'string' ? opts.out.trim() : '',
  };
}
