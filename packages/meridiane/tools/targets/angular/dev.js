import path from 'node:path';

import { findLatestTgz, installPackageFromDist } from '../../infra/dev-support.js';
import { buildAngular } from './build.js';

export async function runAngularDev({ cwd, config, ir, log, opts }) {
  const appRoot = config.appRoot ?? cwd;
  const projectReadmePath = path.join(appRoot, 'README.md');

  log.title('dev — build standalone + install local');
  log.info(`app: ${appRoot}`);
  log.info(`package: ${config.packageName}@${config.version}`);
  log.info(`lib: ${config.libName}`);
  if (config.useSandboxDefaults) log.info('defaults sandbox appliqués');
  if (config.noModels) log.info('models: désactivés (--no-models)');
  else log.info(`spec: ${config.specSource} | formats: ${config.formats.join(', ')} | nullableMode: ${config.requiredMode}`);

  const { distDir } = await buildAngular({
    repoRoot: appRoot,
    config,
    ir,
    log,
    tsconfigPath: 'tsconfig.lib.json',
    packRelativeTo: appRoot,
    projectReadmePath,
  });

  await findLatestTgz(distDir);
  await installPackageFromDist({ packageName: effectiveConfig.packageName, distDir, appRoot, log });

  log.success('bridge installé (node_modules) ✅');
}
