#!/usr/bin/env node
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

import { deriveLibName } from './core/lib-name.js';
import { assertAngularWorkspace, normalizePreset, splitListArgs } from './core/paths.js';
import { readOpenApiSpec } from './core/spec.js';
import { createLogger } from './core/logger.js';
import { generateBridgeWorkspace } from './core/generate.js';

function run(cmd, args, { cwd, env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: cwd ?? process.cwd(),
      env: env ?? process.env,
    });
    child.on('exit', (code) => resolve(code ?? 0));
  });
}

export async function runBuild(packageName, opts) {
  const cwd = process.cwd();
  await assertAngularWorkspace(cwd);

  const libName = deriveLibName(packageName);
  const debug = !!opts.debug;
  const log = createLogger({ debug });

  const requireFromCwd = createRequire(path.join(cwd, 'package.json'));

  const version = opts.version;
  if (!version) throw new Error('Missing --version');

  const noModels = opts.models === false;
  const preset = normalizePreset(opts.preset);
  const include = splitListArgs(opts.include);
  const exclude = splitListArgs(opts.exclude);

  const requiredMode = 'spec';
  log.title('build — génération + packaging npm');
  log.info(`workspace: ${cwd}`);
  log.info(`package: ${packageName}@${version}`);
  log.info(`lib: projects/${libName}`);
  if (noModels) log.info('models: désactivés (--no-models)');
  else log.info(`spec: ${opts.spec} | preset: ${preset}`);

  let spec;
  if (!noModels) {
    log.step('lecture de la spec OpenAPI');
    spec = await readOpenApiSpec(opts.spec);
    log.success('spec chargée');
  }

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
    log,
  });

  // Build the Angular library, then pack the dist output.
  log.step(`ng build ${libName}`);
  const ngPath = requireFromCwd.resolve('@angular/cli/bin/ng.js');
  const ngCode = await run(process.execPath, [ngPath, 'build', libName], { cwd });
  if (ngCode !== 0) process.exit(ngCode);

  const distDir = `dist/${libName}`;
  log.step(`npm pack (${distDir})`);
  const npmCacheDir = path.join(cwd, '.npm-cache');
  const packCode = await run('npm', ['pack'], {
    cwd: distDir,
    env: {
      ...process.env,
      npm_config_cache: npmCacheDir,
      npm_config_update_notifier: 'false',
    },
  });
  if (packCode === 0) log.success(`package prêt: ${distDir}`);
  process.exit(packCode);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  throw new Error('This module is not meant to be executed directly.');
}
