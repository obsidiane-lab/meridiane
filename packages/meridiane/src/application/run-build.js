import process from 'node:process';
import path from 'node:path';

import { normalizeOptions } from '../domain/bridge-options.js';
import { createLogger } from '../infrastructure/logger.js';
import { buildBridgePackage } from './bridge-workflow.js';
import { logConfig } from './generate-bridge.js';

export async function runBuild(packageName, opts) {
  const repoRoot = process.cwd();
  const config = normalizeOptions(packageName, opts);
  const log = createLogger({ debug: config.debug });

  logConfig(log, 'build — standalone', config, { repo: repoRoot });
  const { distDir } = await buildBridgePackage({ config, repoRoot, tsconfigPath: 'tsconfig.lib.prod.json', log });

  log.success(`package prêt: ${path.relative(repoRoot, distDir)}`);
  return 0;
}
