#!/usr/bin/env node
import process from 'node:process';
import { spawn } from 'node:child_process';
import path from 'node:path';

import { deriveLibName } from './core/lib-name.js';
import { splitListArgs } from './core/paths.js';
import { readOpenApiSpec } from './core/spec.js';
import { createLogger } from './core/logger.js';
import { generateBridgeWorkspace } from './core/generate.js';
import { ensureStandaloneWorkspace, ensureToolchainInstalled } from './core/standalone.js';

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
  const debug = !!opts.debug;
  const log = createLogger({ debug });
  const projectReadmePath = path.join(cwd, 'README.md');

  const version = opts.version || '0.0.0';

  const noModels = opts.models === false;
  const formats = splitListArgs(opts.formats);
  const include = splitListArgs(opts.include);
  const exclude = splitListArgs(opts.exclude);

  const libName = deriveLibName(packageName);
  const requiredMode = 'spec';
  const effectiveFormats = formats.length > 0 ? formats : ['application/ld+json'];

  // Standalone mode: works from any repo (backend pipeline or otherwise).
  log.title('build — standalone');
  log.info(`repo: ${cwd}`);
  log.info(`package: ${packageName}@${version}`);
  log.info(`lib: ${libName}`);
  if (noModels) log.info('models: désactivés (--no-models)');
  else log.info(`spec: ${opts.spec} | formats: ${effectiveFormats.join(', ')} | nullableMode: ${requiredMode}`);

  const { workspaceRoot, distRoot, npmCacheDir, requireFromWs } = await ensureStandaloneWorkspace({ repoRoot: cwd, log });
  log.info(`workspace: ${workspaceRoot}`);

  let spec;
  if (!noModels) {
    log.step('lecture de la spec OpenAPI');
    spec = await readOpenApiSpec(opts.spec);
    log.success('spec chargée');
  }

  await ensureToolchainInstalled({ workspaceRoot, requireFromWs, npmCacheDir, log });

  await generateBridgeWorkspace({
    cwd: workspaceRoot,
    libName,
    packageName,
    version,
    noModels,
    spec,
    requiredMode,
    formats: effectiveFormats,
    include,
    exclude,
    debug,
    log,
    distRoot,
    projectReadmePath,
  });

  const ngPackageJsonPath = path.join(workspaceRoot, 'projects', libName, 'ng-package.json');
  const tsconfigProdPath = path.join(workspaceRoot, 'projects', libName, 'tsconfig.lib.prod.json');

  log.step('ng-packagr');
  const ngPackagrPath = requireFromWs.resolve('ng-packagr/src/cli/main.js');
  const packagrCode = await run(process.execPath, [ngPackagrPath, '-p', ngPackageJsonPath, '-c', tsconfigProdPath], {
    cwd: workspaceRoot,
  });
  if (packagrCode !== 0) process.exit(packagrCode);

  const distDir = path.join(distRoot, libName);
  log.step(`npm pack (${path.relative(cwd, distDir)})`);
  const packCode = await run('npm', ['pack'], {
    cwd: distDir,
    env: {
      ...process.env,
      npm_config_cache: npmCacheDir,
      npm_config_update_notifier: 'false',
      npm_config_fund: 'false',
      npm_config_audit: 'false',
    },
  });
  if (packCode === 0) log.success(`package prêt: ${path.relative(cwd, distDir)}`);
  process.exit(packCode);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  throw new Error('This module is not meant to be executed directly.');
}
