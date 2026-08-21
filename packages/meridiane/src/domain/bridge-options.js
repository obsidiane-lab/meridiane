import { deriveLibName } from './lib-name.js';
import {splitListArgs} from './list-values.js';

const DEFAULT_FORMATS = ['application/ld+json'];
const SANDBOX_PACKAGE_NAME = '@obsidiane/bridge-sandbox';

function normalizeCommonOptions(opts) {
  const noModels = opts?.models === false;
  const formats = splitListArgs(opts?.formats);
  const include = splitListArgs(opts?.include);
  const exclude = splitListArgs(opts?.exclude);
  const debug = !!opts?.debug;

  return { noModels, formats, include, exclude, debug };
}

function normalizeFormats(formats) {
  return formats.length > 0 ? formats : [...DEFAULT_FORMATS];
}

function normalizeVersion(version) {
  const raw = typeof version === 'string' ? version.trim() : '';
  return raw || '0.0.0';
}

function normalizeNamedOptions(mode, packageName, opts) {
  const common = normalizeCommonOptions(opts);
  const normalizedPackageName = String(packageName || '').trim();
  if (!normalizedPackageName) throw new Error('Missing packageName');

  return {
    mode,
    packageName: normalizedPackageName,
    libName: deriveLibName(normalizedPackageName),
    version: normalizeVersion(opts?.version),
    requiredMode: 'spec',
    formats: normalizeFormats(common.formats),
    include: common.include,
    exclude: common.exclude,
    noModels: common.noModels,
    debug: common.debug,
  };
}

export function normalizeBuildOptions(packageName, opts) {
  return normalizeNamedOptions('build', packageName, opts);
}

export function normalizeGenerateOptions(packageName, opts) {
  return {
    ...normalizeNamedOptions('generate', packageName, opts),
    outDir: typeof opts?.out === 'string' ? opts.out.trim() : '',
  };
}

export function normalizeDevOptions(packageName, opts) {
  const common = normalizeCommonOptions(opts);
  const useSandboxDefaults = packageName === undefined;
  const effectivePackageName = String(packageName ?? SANDBOX_PACKAGE_NAME).trim();

  return {
    mode: 'dev',
    useSandboxDefaults,
    packageName: effectivePackageName,
    libName: deriveLibName(effectivePackageName),
    version: '0.0.0-dev',
    requiredMode: 'all',
    formats: normalizeFormats(common.formats),
    include: common.include,
    exclude: common.exclude,
    noModels: common.noModels,
    debug: common.debug,
  };
}
