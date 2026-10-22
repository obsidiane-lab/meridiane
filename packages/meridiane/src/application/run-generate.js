import process from 'node:process';
import path from 'node:path';

import { normalizeOptions } from '../domain/bridge-options.js';
import { createLogger } from '../infrastructure/logger.js';
import { generateBridge, logConfig } from './generate-bridge.js';

export async function runGenerate(packageName, opts) {
  const root = process.cwd();
  const config = normalizeOptions(packageName, opts);
  const log = createLogger({ debug: config.debug });
  const projectDir = path.resolve(root, config.outDir || path.join('projects', config.libName));

  logConfig(log, 'generate — workspace files', config, { repo: root, target: path.relative(root, projectDir) });
  await generateBridge({ config, root, projectDir, log });

  log.success(`bridge généré: ${path.relative(root, projectDir)}`);
  return 0;
}
