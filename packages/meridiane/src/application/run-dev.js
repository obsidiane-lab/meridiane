import process from 'node:process';
import path from 'node:path';

import { normalizeDevOptions } from '../domain/bridge-options.js';
import { createLogger } from '../infrastructure/logger.js';
import {resolveDevAppRoot, resolveSandboxAppRoot, resolveSpecSource} from '../infrastructure/dev-project.js';
import {installPackageFromDist} from '../infrastructure/local-package-install.js';
import { readOpenApiSpec } from '../infrastructure/spec-loader.js';
import { runBridgeWorkflow } from './bridge-workflow.js';

async function loadDevSpec({config, opts, appRoot, log}) {
  if (config.noModels) return {noModels: true};

  const specSource = await resolveSpecSource({
    useSandboxDefaults: config.useSandboxDefaults,
    appRoot,
    specArg: opts.spec,
  });

  if (!specSource) throw new Error('Missing --spec (url or JSON file path)');

  try {
    return {noModels: false, specSource, spec: await readOpenApiSpec(specSource)};
  } catch (error) {
    const canSkipModels = config.useSandboxDefaults && opts.spec == null;
    if (!canSkipModels) throw error;

    log.warn(
      'spec OpenAPI indisponible (backend non démarré ?) → génération des models ignorée. ' +
        'Démarrez le backend ou passez `--spec ./openapi.json` (ou `--no-models`).'
    );
    return {noModels: true, specSource};
  }
}

export async function runDev(packageName, opts) {
  const startCwd = process.cwd();
  const config = normalizeDevOptions(packageName, opts);
  const log = createLogger({ debug: config.debug });

  const appRoot = config.useSandboxDefaults ? await resolveSandboxAppRoot(startCwd) : await resolveDevAppRoot(startCwd);
  const projectReadmePath = path.join(appRoot, 'README.md');
  const {noModels, specSource, spec} = await loadDevSpec({config, opts, appRoot, log});

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

  await installPackageFromDist({ packageName: config.packageName, distDir, appRoot, log });

  log.success('bridge installé (node_modules) ✅');
  return 0;
}
