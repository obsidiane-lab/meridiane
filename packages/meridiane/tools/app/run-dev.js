import process from 'node:process';
import path from 'node:path';

import { normalizeDevOptions } from '../domain/bridge-options.js';
import { createLogger } from '../infra/logger.js';
import {
  findLatestTgz,
  installPackageFromDist,
  resolveDevAppRoot,
  resolveSandboxAppRoot,
  resolveSpecSource,
} from '../infra/dev-support.js';
import { readOpenApiSpec } from '../infra/spec-loader.js';
import { runBridgeWorkflow } from './bridge-workflow.js';

export async function runDev(packageName, opts) {
  const startCwd = process.cwd();
  const config = normalizeDevOptions(packageName, opts);
  const log = createLogger({ debug: config.debug });

  const appRoot = config.useSandboxDefaults ? await resolveSandboxAppRoot(startCwd) : await resolveDevAppRoot(startCwd);
  const projectReadmePath = path.join(appRoot, 'README.md');

  const specSource = config.noModels
    ? undefined
    : await resolveSpecSource({
        useSandboxDefaults: config.useSandboxDefaults,
        appRoot,
        specArg: opts.spec,
      });
  let noModels = config.noModels;
  let spec;
  if (!noModels) {
    if (!specSource) throw new Error('Missing --spec (url or JSON file path)');
    try {
      spec = await readOpenApiSpec(specSource);
    } catch (err) {
      if (config.useSandboxDefaults && opts.spec == null) {
        noModels = true;
        log.warn(
          "spec OpenAPI indisponible (backend non démarré ?) → génération des models ignorée. " +
            'Démarrez le backend ou passez `--spec ./openapi.json` (ou `--no-models`).'
        );
      } else {
        throw err;
      }
    }
  }

  log.title('dev — build standalone + install local');
  log.info(`app: ${appRoot}`);
  log.info(`package: ${config.packageName}@${config.version}`);
  log.info(`lib: ${config.libName}`);
  if (config.useSandboxDefaults) log.info('defaults sandbox appliqués');
  if (noModels) log.info('models: désactivés (--no-models)');
  else log.info(`spec: ${specSource} | formats: ${config.formats.join(', ')} | nullableMode: ${config.requiredMode}`);

  const { distDir } = await runBridgeWorkflow({
    repoRoot: appRoot,
    libName: config.libName,
    packageName: config.packageName,
    version: config.version,
    noModels,
    spec,
    specSource,
    requiredMode: config.requiredMode,
    formats: config.formats,
    include: config.include,
    exclude: config.exclude,
    debug: config.debug,
    log,
    tsconfigPath: 'tsconfig.lib.json',
    packRelativeTo: appRoot,
    projectReadmePath,
  });

  await findLatestTgz(distDir);
  await installPackageFromDist({ packageName: config.packageName, distDir, appRoot, log });

  log.success('bridge installé (node_modules) ✅');
  return 0;
}
