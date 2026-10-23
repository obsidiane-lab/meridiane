import path from 'node:path';

import { configureBridgeOutput, writeBridgeFiles } from '../generators/bridge/write-bridge-files.js';
import { writeModelFiles } from '../generators/models/write-model-files.js';
import { readOpenApiSpec } from '../infrastructure/spec-loader.js';

/** Logs the command title and its configuration. */
export function logConfig(log, title, config, details) {
  log.title(title);
  for (const [label, value] of Object.entries(details)) log.info(`${label}: ${value}`);
  log.info(`package: ${config.packageName}@${config.version}`);
  log.info(`lib: ${config.libName}`);
  log.info(config.noModels ? 'models: désactivés (--no-models)' : `spec: ${config.specSource}`);
}

/**
 * Generates the Angular bridge sources (library files and models) in `projectDir`.
 * The project README of `root` is appended to the bridge README.
 */
export async function generateBridge({ config, root, projectDir, distRoot, log }) {
  const spec = config.noModels ? undefined : await loadSpec(config.specSource, log);

  log.step(`génération de la librairie (${path.relative(root, projectDir)})`);
  await writeBridgeFiles({
    projectDir,
    libName: config.libName,
    packageName: config.packageName,
    version: config.version,
    projectReadmePath: path.join(root, 'README.md'),
    log,
  });
  if (distRoot) await configureBridgeOutput({ projectDir, distRoot, libName: config.libName, log });

  if (!spec) return;
  log.step('génération des models (OpenAPI)');
  await writeModelFiles({ projectDir, spec, include: config.include, exclude: config.exclude, log });
}

async function loadSpec(specSource, log) {
  if (!specSource) throw new Error('Missing --spec (url or JSON file path)');

  log.step('lecture de la spec OpenAPI');
  const spec = await readOpenApiSpec(specSource);
  log.success('spec chargée');
  return spec;
}
