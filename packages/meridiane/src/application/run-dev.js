import process from 'node:process';
import path from 'node:path';

import { normalizeDevOptions } from '../domain/bridge-options.js';
import { createLogger } from '../infrastructure/logger.js';
import {resolveDevAppRoot} from '../infrastructure/dev-project.js';
import {installPackageFromDist} from '../infrastructure/local-package-install.js';
import { runBridgeWorkflow } from './bridge-workflow.js';

export async function runDev(packageName, opts) {
  const config = normalizeDevOptions(packageName, opts);
  const log = createLogger({ debug: config.debug });

  const appRoot = await resolveDevAppRoot(process.cwd());
  const projectReadmePath = path.join(appRoot, 'README.md');

  log.title('dev — build standalone + install local');
  log.info(`app: ${appRoot}`);
  log.info(`package: ${config.packageName}@${config.version}`);
  log.info(`lib: ${config.libName}`);
  if (config.noModels) log.info('models: désactivés (--no-models)');
  else log.info(`spec: ${opts.spec}`);

  const { distDir } = await runBridgeWorkflow({
    repoRoot: appRoot,
    libName: config.libName,
    packageName: config.packageName,
    version: config.version,
    noModels: config.noModels,
    specSource: opts.spec,
    requiredMode: config.requiredMode,
    include: config.include,
    exclude: config.exclude,
    debug: config.debug,
    log,
    tsconfigPath: 'tsconfig.lib.json',
    packRelativeTo: appRoot,
    projectReadmePath,
  });

  await installPackageFromDist({ packageName: config.packageName, distDir, appRoot, log });

  log.success('bridge installé (node_modules) ✅');
  return 0;
}
