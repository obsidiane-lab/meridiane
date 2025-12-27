import process from 'node:process';
import path from 'node:path';

import { normalizeBuildOptions } from '../domain/bridge-options.js';
import { createLogger } from '../infra/logger.js';
import { runBridgeWorkflow } from './bridge-workflow.js';

export async function runBuild(packageName, opts) {
  const cwd = process.cwd();
  const config = normalizeBuildOptions(packageName, opts);
  const log = createLogger({ debug: config.debug });
  const projectReadmePath = path.join(cwd, 'README.md');

  log.title('build — standalone');
  log.info(`repo: ${cwd}`);
  log.info(`package: ${config.packageName}@${config.version}`);
  log.info(`lib: ${config.libName}`);
  if (config.noModels) log.info('models: désactivés (--no-models)');
  else log.info(`spec: ${opts.spec} | formats: ${config.formats.join(', ')} | nullableMode: ${config.requiredMode}`);

  const { distDir } = await runBridgeWorkflow({
    repoRoot: cwd,
    libName: config.libName,
    packageName: config.packageName,
    version: config.version,
    noModels: config.noModels,
    specSource: opts.spec,
    requiredMode: config.requiredMode,
    formats: config.formats,
    include: config.include,
    exclude: config.exclude,
    debug: config.debug,
    log,
    tsconfigPath: 'tsconfig.lib.prod.json',
    packRelativeTo: cwd,
    projectReadmePath,
  });

  log.success(`package prêt: ${path.relative(cwd, distDir)}`);
  return 0;
}
