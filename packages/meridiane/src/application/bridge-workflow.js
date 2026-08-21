import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { generateBridgeWorkspace } from './generate-bridge.js';
import { readOpenApiSpec } from '../infrastructure/spec-loader.js';
import { ExitCodeError, runCommand } from '../infrastructure/exec.js';

const ngPackagrPath = fileURLToPath(import.meta.resolve('ng-packagr/src/cli/main.js'));

export async function runBridgeWorkflow({
  repoRoot,
  libName,
  packageName,
  version,
  noModels,
  spec,
  specSource,
  requiredMode,
  formats,
  include,
  exclude,
  debug,
  log,
  tsconfigPath,
  packRelativeTo,
  projectReadmePath,
}) {
  const distRoot = path.join(repoRoot, 'dist');
  const buildRoot = path.join(distRoot, '.meridiane-workspace');
  const npmCacheDir = path.join(buildRoot, '.npm-cache');
  await fs.rm(buildRoot, { recursive: true, force: true });
  await fs.mkdir(buildRoot, { recursive: true });
  log?.info?.(`workspace: ${buildRoot}`);

  const resolvedSpec = await loadSpecIfNeeded({ noModels, spec, specSource, log });

  await generateBridgeWorkspace({
    cwd: buildRoot,
    libName,
    packageName,
    version,
    noModels,
    spec: resolvedSpec,
    requiredMode,
    formats,
    include,
    exclude,
    debug,
    log,
    distRoot,
    projectReadmePath,
  });

  const projectDir = path.join(buildRoot, 'projects', libName);
  const ngPackageJsonPath = path.join(projectDir, 'ng-package.json');
  const tsconfigAbsPath = path.join(projectDir, tsconfigPath);

  log?.step?.('ng-packagr');
  const packagrCode = await runCommand(process.execPath, [ngPackagrPath, '-p', ngPackageJsonPath, '-c', tsconfigAbsPath], {
    cwd: buildRoot,
  });
  if (packagrCode !== 0) throw new ExitCodeError(`ng-packagr failed (exit ${packagrCode})`, packagrCode);

  const distDir = path.join(distRoot, libName);
  const packRel = packRelativeTo ? path.relative(packRelativeTo, distDir) : distDir;
  log?.step?.(`npm pack (${packRel})`);
  await cleanupPackedTarballs(distDir);
  const packCode = await runCommand('npm', ['pack'], {
    cwd: distDir,
    env: {
      ...process.env,
      npm_config_cache: npmCacheDir,
      npm_config_update_notifier: 'false',
      npm_config_fund: 'false',
      npm_config_audit: 'false',
    },
  });
  if (packCode !== 0) throw new ExitCodeError(`npm pack failed (exit ${packCode})`, packCode);

  return { distDir };
}

async function loadSpecIfNeeded({ noModels, spec, specSource, log }) {
  if (noModels || spec) return spec;
  if (!specSource) throw new Error('Missing --spec (url or JSON file path)');

  log?.step?.('lecture de la spec OpenAPI');
  const loadedSpec = await readOpenApiSpec(specSource);
  log?.success?.('spec chargée');
  return loadedSpec;
}

async function cleanupPackedTarballs(distDir) {
  const entries = await fs.readdir(distDir, {withFileTypes: true});
  const tarballs = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.tgz'));
  await Promise.all(tarballs.map((entry) => fs.rm(path.join(distDir, entry.name), {force: true})));
}
