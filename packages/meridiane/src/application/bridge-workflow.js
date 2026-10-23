import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { generateBridge } from './generate-bridge.js';
import { ExitCodeError, runCommand } from '../infrastructure/exec.js';
import { ensureCleanDir } from '../infrastructure/files.js';

const ngPackagrPath = fileURLToPath(import.meta.resolve('ng-packagr/src/cli/main.js'));
/** `node_modules` holding the CLI's Angular toolchain (wherever npx installed it). */
const toolchainModules = path.resolve(fileURLToPath(import.meta.resolve('@angular/core/package.json')), '../../..');

/** Generates the bridge in an isolated workspace under `dist/`, builds it with ng-packagr and packs it. */
export async function buildBridgePackage({ config, repoRoot, tsconfigPath, log }) {
  const distRoot = path.join(repoRoot, 'dist');
  const buildRoot = path.join(distRoot, '.meridiane-workspace');
  const projectDir = path.join(buildRoot, 'projects', config.libName);
  await ensureCleanDir(buildRoot);
  // The bridge compiles against the CLI's Angular and RxJS, not the dependencies of the current project.
  await fs.symlink(toolchainModules, path.join(buildRoot, 'node_modules'), 'junction');
  log.info(`workspace: ${path.relative(repoRoot, buildRoot)}`);

  await generateBridge({ config, root: repoRoot, projectDir, distRoot, log });

  log.step('ng-packagr');
  const packagrCode = await runCommand(
    process.execPath,
    [ngPackagrPath, '-p', path.join(projectDir, 'ng-package.json'), '-c', path.join(projectDir, tsconfigPath)],
    { cwd: buildRoot }
  );
  if (packagrCode !== 0) throw new ExitCodeError(`ng-packagr failed (exit ${packagrCode})`, packagrCode);

  const distDir = path.join(distRoot, config.libName);
  log.step(`npm pack (${path.relative(repoRoot, distDir)})`);
  await cleanupPackedTarballs(distDir);
  const packCode = await runCommand('npm', ['pack'], {
    cwd: distDir,
    env: {
      ...process.env,
      npm_config_cache: path.join(buildRoot, '.npm-cache'),
      npm_config_update_notifier: 'false',
      npm_config_fund: 'false',
      npm_config_audit: 'false',
    },
  });
  if (packCode !== 0) throw new ExitCodeError(`npm pack failed (exit ${packCode})`, packCode);

  return { distDir };
}

async function cleanupPackedTarballs(distDir) {
  const entries = await fs.readdir(distDir, {withFileTypes: true});
  const tarballs = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.tgz'));
  await Promise.all(tarballs.map((entry) => fs.rm(path.join(distDir, entry.name), {force: true})));
}
