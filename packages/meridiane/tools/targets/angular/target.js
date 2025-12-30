import path from 'node:path';

import { deriveLibName } from '../../domain/lib-name.js';
import { NotSupportedError } from '../target.interface.js';
import { generateAngularBridge } from './generate.js';
import { buildAngular } from './build.js';
import { runAngularDev } from './dev.js';
import { resolveDevAppRoot, resolveSandboxAppRoot, resolveSpecSource } from '../../infra/dev-support.js';

const SANDBOX_PACKAGE_NAME = '@obsidiane/bridge-sandbox';

export function createAngularTarget() {
  return {
    id: 'angular',
    capabilities: {
      generate: true,
      build: true,
      dev: true,
    },
    async normalize({ config, cwd, mode, opts }) {
      const useSandboxDefaults = mode === 'dev' && !config.packageName;
      const packageName = config.packageName || (useSandboxDefaults ? SANDBOX_PACKAGE_NAME : '');
      if (!packageName && mode !== 'dev') throw new Error('Missing packageName');

      const libName = packageName ? deriveLibName(packageName) : undefined;
      const version =
        config.version ??
        (mode === 'dev'
          ? '0.0.0-dev'
          : '0.0.0');
      const requiredMode = mode === 'dev' ? 'all' : 'spec';

      const normalized = {
        ...config,
        packageName,
        libName,
        version,
        requiredMode,
        useSandboxDefaults,
      };

      if (mode === 'dev') {
        const appRoot = useSandboxDefaults ? await resolveSandboxAppRoot(cwd) : await resolveDevAppRoot(cwd);
        const specSource = normalized.noModels
          ? undefined
          : await resolveSpecSource({
              useSandboxDefaults,
              appRoot,
              specArg: opts?.spec,
            });
        return {
          ...normalized,
          appRoot,
          specSource,
          allowMissingSpec: useSandboxDefaults && opts?.spec == null,
        };
      }

      return normalized;
    },
    async run({ cwd, mode, config, ir, log, opts }) {
      if (mode === 'generate') {
        const projectDir = config.outDir
          ? path.resolve(cwd, config.outDir)
          : path.resolve(cwd, 'projects', config.libName);
        const projectReadmePath = path.join(cwd, 'README.md');

        log.title('generate — workspace files');
        log.info(`repo: ${cwd}`);
        log.info(`package: ${config.packageName}@${config.version}`);
        log.info(`lib: ${config.libName}`);
        log.info(`target: ${path.relative(cwd, projectDir)}`);
        if (config.noModels) log.info('models: désactivés (--no-models)');
        else log.info(`spec: ${config.specSource} | formats: ${config.formats.join(', ')} | nullableMode: ${config.requiredMode}`);

        await generateAngularBridge({
          cwd,
          projectDir,
          libName: config.libName,
          packageName: config.packageName,
          version: config.version,
          noModels: config.noModels,
          ir,
          debug: config.debug,
          log,
          projectReadmePath,
        });

        log.success(`bridge généré: ${path.relative(cwd, projectDir)}`);
        return;
      }

      if (mode === 'build') {
        const projectReadmePath = path.join(cwd, 'README.md');
        log.title('build — standalone');
        log.info(`repo: ${cwd}`);
        log.info(`package: ${config.packageName}@${config.version}`);
        log.info(`lib: ${config.libName}`);
        if (config.noModels) log.info('models: désactivés (--no-models)');
        else log.info(`spec: ${config.specSource} | formats: ${config.formats.join(', ')} | nullableMode: ${config.requiredMode}`);

        const { distDir } = await buildAngular({
          repoRoot: cwd,
          config,
          ir,
          log,
          tsconfigPath: 'tsconfig.lib.prod.json',
          packRelativeTo: cwd,
          projectReadmePath,
        });

        log.success(`package prêt: ${path.relative(cwd, distDir)}`);
        return;
      }

      if (mode === 'dev') {
        await runAngularDev({ cwd, config, ir, log, opts });
        return;
      }

      throw new NotSupportedError({ target: 'angular', mode });
    },
  };
}
