import path from 'node:path';

import { configureBridgeOutput, writeBridgeFiles } from '../generators/bridge/write-bridge-files.js';
import { writeModelFiles } from '../generators/models/write-model-files.js';

/** Generates the Angular bridge sources in a workspace project. */
export async function generateBridgeWorkspace({
  cwd,
  libName,
  packageName,
  version,
  noModels,
  spec,
  requiredMode,
  formats,
  include,
  exclude,
  debug,
  log,
  distRoot,
  projectDir: configuredProjectDir,
  projectReadmePath,
}) {
  const projectDir = configuredProjectDir ?? path.resolve(cwd, 'projects', libName);

  log?.step?.(`génération de la librairie (${path.relative(cwd, projectDir)})`);
  await writeBridgeFiles({
    projectDir,
    libName,
    packageName,
    version,
    projectReadmePath,
    debug,
    log,
  });

  if (distRoot) await configureBridgeOutput({ projectDir, distRoot, libName, log });

  if (noModels) {
    log?.info?.('models ignorés (--no-models)');
    if (debug) log?.debug?.('[meridiane] --no-models enabled, skipping models generation');
    return;
  }

  if (!spec) throw new Error('Internal error: spec is required when noModels=false');

  log?.step?.('génération des models (OpenAPI)');
  await writeModelFiles({ projectDir, spec, requiredMode, formats, include, exclude, debug, log });
  log?.success?.('génération terminée');
}
