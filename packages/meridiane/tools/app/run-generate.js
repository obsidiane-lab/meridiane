import process from 'node:process';
import path from 'node:path';

import { normalizeGenerateOptions } from '../domain/bridge-options.js';
import { createLogger } from '../infra/logger.js';
import { readOpenApiSpec } from '../infra/spec-loader.js';
import { generateBridgeWorkspace } from '../infra/generate/bridge.js';

function resolveProjectDir({ cwd, libName, outDir }) {
  if (outDir && outDir.length > 0) return path.resolve(cwd, outDir);
  return path.resolve(cwd, 'projects', libName);
}

export async function runGenerate(packageName, opts) {
  const cwd = process.cwd();
  const config = normalizeGenerateOptions(packageName, opts);
  const log = createLogger({ debug: config.debug });
  const projectReadmePath = path.join(cwd, 'README.md');

  const projectDir = resolveProjectDir({ cwd, libName: config.libName, outDir: config.outDir });
  const specSource = opts?.spec;

  log.title('generate — workspace files');
  log.info(`repo: ${cwd}`);
  log.info(`package: ${config.packageName}@${config.version}`);
  log.info(`lib: ${config.libName}`);
  log.info(`target: ${path.relative(cwd, projectDir)}`);
  if (config.noModels) log.info('models: désactivés (--no-models)');
  else log.info(`spec: ${specSource} | formats: ${config.formats.join(', ')} | nullableMode: ${config.requiredMode}`);

  let spec;
  if (!config.noModels) {
    if (!specSource) throw new Error('Missing --spec (url or JSON file path)');
    log.step('lecture de la spec OpenAPI');
    spec = await readOpenApiSpec(specSource);
    log.success('spec chargée');
  }

  await generateBridgeWorkspace({
    cwd,
    projectDir,
    libName: config.libName,
    packageName: config.packageName,
    version: config.version,
    noModels: config.noModels,
    spec,
    requiredMode: config.requiredMode,
    formats: config.formats,
    include: config.include,
    exclude: config.exclude,
    debug: config.debug,
    log,
    projectReadmePath,
  });

  log.success(`bridge généré: ${path.relative(cwd, projectDir)}`);
  return 0;
}
