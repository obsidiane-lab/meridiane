#!/usr/bin/env node
import process from 'node:process';

import { deriveLibName } from './core/lib-name.js';
import { assertAngularWorkspace, normalizePreset, splitListArgs } from './core/paths.js';
import { readOpenApiSpec } from './core/spec.js';
import { generateBridgeWorkspace } from './core/generate.js';

export async function runDev(packageName, opts) {
  const cwd = process.cwd();
  await assertAngularWorkspace(cwd);

  const libName = deriveLibName(packageName);
  const debug = !!opts.debug;

  const noModels = opts.models === false;
  const preset = normalizePreset(opts.preset);
  const include = splitListArgs(opts.include);
  const exclude = splitListArgs(opts.exclude);

  const version = '0.0.0-dev';
  const requiredMode = 'all-optional';

  const spec = noModels ? undefined : await readOpenApiSpec(opts.spec);

  await generateBridgeWorkspace({
    cwd,
    libName,
    packageName,
    version,
    noModels,
    spec,
    requiredMode,
    preset,
    include,
    exclude,
    debug,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  throw new Error('This module is not meant to be executed directly.');
}
