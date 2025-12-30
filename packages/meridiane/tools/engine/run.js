import process from 'node:process';

import { createLogger } from '../infra/logger.js';
import { readOpenApiSpec } from '../infra/spec-loader.js';
import { buildBridgeIR } from './build-ir.js';
import { normalizeCommonOptions } from './normalize-options.js';
import { resolveTarget } from '../targets/registry.js';

export async function runEngine({ mode, packageNameArg, opts }) {
  const cwd = process.cwd();
  const baseConfig = normalizeCommonOptions({ mode, packageNameArg, opts });
  const log = createLogger({ debug: baseConfig.debug });

  const target = resolveTarget(baseConfig.target);
  const normalized = target.normalize ? await target.normalize({ config: baseConfig, cwd, mode, opts, log }) : baseConfig;

  const config = { ...baseConfig, ...normalized };
  let spec;
  let ir;

  if (!config.noModels) {
    if (!config.specSource) throw new Error('Missing --spec (url or JSON file path)');
    log.step('lecture de la spec OpenAPI');
    try {
      spec = await readOpenApiSpec(config.specSource);
      log.success('spec chargée');
    } catch (err) {
      if (config.allowMissingSpec) {
        config.noModels = true;
        log.warn(
          "spec OpenAPI indisponible (backend non démarré ?) → génération des models ignorée. " +
            'Démarrez le backend ou passez `--spec ./openapi.json` (ou `--no-models`).'
        );
      } else {
        throw err;
      }
    }
  }

  if (!config.noModels && spec) {
    ir = buildBridgeIR(spec, {
      requiredMode: config.requiredMode,
      formats: config.formats,
      include: config.include,
      exclude: config.exclude,
    });
  }

  await target.run({
    cwd,
    mode,
    config,
    spec,
    ir,
    log,
  });
}
