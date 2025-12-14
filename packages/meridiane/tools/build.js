#!/usr/bin/env node
import process from 'node:process';
import { spawn } from 'node:child_process';

import { deriveLibName } from './core/lib-name.js';
import { assertAngularWorkspace, normalizePreset, splitListArgs } from './core/paths.js';
import { readOpenApiSpec } from './core/spec.js';
import { generateBridgeWorkspace } from './core/generate.js';

function run(cmd, args, { cwd } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: cwd ?? process.cwd(),
      env: process.env,
    });
    child.on('exit', (code) => resolve(code ?? 0));
  });
}

export async function runBuild(packageName, opts) {
  const cwd = process.cwd();
  await assertAngularWorkspace(cwd);

  const libName = deriveLibName(packageName);
  const debug = !!opts.debug;

  const version = opts.version;
  if (!version) throw new Error('Missing --version');

  const noModels = opts.models === false;
  const preset = normalizePreset(opts.preset);
  const include = splitListArgs(opts.include);
  const exclude = splitListArgs(opts.exclude);

  const requiredMode = 'spec';
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

  // Build the Angular library, then pack the dist output.
  const ngCode = await run(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'build', libName], { cwd });
  if (ngCode !== 0) process.exit(ngCode);

  const distDir = `dist/${libName}`;
  const packCode = await run('npm', ['pack'], { cwd: distDir });
  process.exit(packCode);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  throw new Error('This module is not meant to be executed directly.');
}
