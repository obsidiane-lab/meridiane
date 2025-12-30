import { splitListArgs } from '../domain/paths.js';

const DEFAULT_FORMATS = ['application/ld+json'];

function normalizeTarget(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return v || 'angular';
}

function normalizeFormats(formats) {
  const list = splitListArgs(formats);
  return list.length > 0 ? list : [...DEFAULT_FORMATS];
}

export function normalizeCommonOptions({ mode, packageNameArg, opts }) {
  const packageName = typeof packageNameArg === 'string' ? packageNameArg.trim() : '';
  const specSource = typeof opts?.spec === 'string' && opts.spec.trim().length > 0 ? opts.spec.trim() : undefined;
  const outDir = typeof opts?.out === 'string' && opts.out.trim().length > 0 ? opts.out.trim() : undefined;
  const version = typeof opts?.version === 'string' && opts.version.trim().length > 0 ? opts.version.trim() : undefined;

  return {
    mode,
    target: normalizeTarget(opts?.target),
    packageName,
    specSource,
    outDir,
    version,
    requiredMode: 'spec',
    formats: normalizeFormats(opts?.formats),
    include: splitListArgs(opts?.include),
    exclude: splitListArgs(opts?.exclude),
    noModels: opts?.models === false,
    debug: !!opts?.debug,
  };
}
