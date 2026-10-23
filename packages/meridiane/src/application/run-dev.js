import process from 'node:process';

import { normalizeOptions } from '../domain/bridge-options.js';
import { createLogger } from '../infrastructure/logger.js';
import {resolveDevAppRoot} from '../infrastructure/dev-project.js';
import {installPackageFromDist} from '../infrastructure/local-package-install.js';
import { buildBridgePackage } from './bridge-workflow.js';
import { logConfig } from './generate-bridge.js';

export async function runDev(packageName, opts) {
  const config = { ...normalizeOptions(packageName, opts), version: '0.0.0-dev' };
  const log = createLogger({ debug: config.debug });
  const appRoot = await resolveDevAppRoot(process.cwd());

  logConfig(log, 'dev — build standalone + install local', config, { app: appRoot });
  const { distDir } = await buildBridgePackage({ config, repoRoot: appRoot, tsconfigPath: 'tsconfig.lib.json', log });
  await installPackageFromDist({ packageName: config.packageName, distDir, appRoot, log });

  log.success('bridge installé (node_modules) ✅');
  return 0;
}
