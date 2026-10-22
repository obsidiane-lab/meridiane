import { deriveLibName } from './lib-name.js';
import {splitListArgs} from './list-values.js';

function normalizeVersion(version) {
  const raw = typeof version === 'string' ? version.trim() : '';
  return raw || '0.0.0';
}

function normalizeNamedOptions(packageName, opts) {
  const normalizedPackageName = String(packageName || '').trim();
  if (!normalizedPackageName) throw new Error('Missing packageName');

  return {
    packageName: normalizedPackageName,
    libName: deriveLibName(normalizedPackageName),
    version: normalizeVersion(opts?.version),
    requiredMode: 'spec',
    include: splitListArgs(opts?.include),
    exclude: splitListArgs(opts?.exclude),
    noModels: opts?.models === false,
    debug: !!opts?.debug,
  };
}

export function normalizeBuildOptions(packageName, opts) {
  return normalizeNamedOptions(packageName, opts);
}

export function normalizeGenerateOptions(packageName, opts) {
  return {
    ...normalizeNamedOptions(packageName, opts),
    outDir: typeof opts?.out === 'string' ? opts.out.trim() : '',
  };
}

export function normalizeDevOptions(packageName, opts) {
  return {
    ...normalizeNamedOptions(packageName, opts),
    version: '0.0.0-dev',
  };
}
