import process from 'node:process';
import path from 'node:path';

import { ensureStandaloneWorkspace, ensureToolchainInstalled } from '../../infra/standalone-workspace.js';
import { ExitCodeError, runCommand } from '../../infra/exec.js';
import { generateAngularBridge } from './generate.js';

export async function buildAngular({ repoRoot, config, ir, log, tsconfigPath, packRelativeTo, projectReadmePath }) {
  const { workspaceRoot, distRoot, npmCacheDir, requireFromWs } = await ensureStandaloneWorkspace({ repoRoot, log });
  log?.info?.(`workspace: ${workspaceRoot}`);

  await ensureToolchainInstalled({ workspaceRoot, requireFromWs, npmCacheDir, log });

  const projectDir = path.join(workspaceRoot, 'projects', config.libName);

  await generateAngularBridge({
    cwd: workspaceRoot,
    projectDir,
    libName: config.libName,
    packageName: config.packageName,
    version: config.version,
    noModels: config.noModels,
    ir,
    debug: config.debug,
    log,
    projectReadmePath,
    distRoot,
  });

  const ngPackageJsonPath = path.join(workspaceRoot, 'projects', config.libName, 'ng-package.json');
  const tsconfigAbsPath = path.join(workspaceRoot, 'projects', config.libName, tsconfigPath);

  log?.step?.('ng-packagr');
  const ngPackagrPath = requireFromWs.resolve('ng-packagr/src/cli/main.js');
  const packagrCode = await runCommand(process.execPath, [ngPackagrPath, '-p', ngPackageJsonPath, '-c', tsconfigAbsPath], {
    cwd: workspaceRoot,
  });
  if (packagrCode !== 0) throw new ExitCodeError(`ng-packagr failed (exit ${packagrCode})`, packagrCode);

  const distDir = path.join(distRoot, config.libName);
  const packRel = packRelativeTo ? path.relative(packRelativeTo, distDir) : distDir;
  log?.step?.(`npm pack (${packRel})`);
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
