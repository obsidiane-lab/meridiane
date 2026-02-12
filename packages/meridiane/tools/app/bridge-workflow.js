import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs/promises';

import { readOpenApiSpec } from '../infra/spec-loader.js';
import { generateBridgeWorkspace } from '../infra/generate/bridge.js';
import { ensureStandaloneWorkspace, ensureToolchainInstalled } from '../infra/standalone-workspace.js';
import { ExitCodeError, runCommand } from '../infra/exec.js';

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
  const { workspaceRoot, distRoot, npmCacheDir, requireFromWs } = await ensureStandaloneWorkspace({ repoRoot, log });
  log?.info?.(`workspace: ${workspaceRoot}`);

  let resolvedSpec = spec;
  if (!noModels) {
    if (!resolvedSpec) {
      if (!specSource) throw new Error('Missing --spec (url or JSON file path)');
      log?.step?.('lecture de la spec OpenAPI');
      resolvedSpec = await readOpenApiSpec(specSource);
      log?.success?.('spec chargée');
    }
  }

  await ensureToolchainInstalled({ workspaceRoot, requireFromWs, npmCacheDir, log });

  await generateBridgeWorkspace({
    cwd: workspaceRoot,
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

  const ngPackageJsonPath = path.join(workspaceRoot, 'projects', libName, 'ng-package.json');
  const tsconfigAbsPath = path.join(workspaceRoot, 'projects', libName, tsconfigPath);

  log?.step?.('ng-packagr');
  const ngPackagrPath = requireFromWs.resolve('ng-packagr/src/cli/main.js');
  const packagrCode = await runCommand(process.execPath, [ngPackagrPath, '-p', ngPackageJsonPath, '-c', tsconfigAbsPath], {
    cwd: workspaceRoot,
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

  return { workspaceRoot, distRoot, distDir, npmCacheDir };
}

async function cleanupPackedTarballs(distDir) {
  const entries = await fs.readdir(distDir, {withFileTypes: true});
  const tarballs = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.tgz'));
  await Promise.all(tarballs.map((entry) => fs.rm(path.join(distDir, entry.name), {force: true})));
}
