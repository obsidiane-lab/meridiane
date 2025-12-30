import path from 'node:path';

import { deriveLibName } from '../../domain/lib-name.js';
import { NotSupportedError } from '../target.interface.js';
import { generateSymfonyBridge } from './generate.js';

function pascalize(tokens) {
  return tokens
    .filter(Boolean)
    .map((t) => String(t).replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
    .filter(Boolean)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join('');
}

function parseComposerName(packageName) {
  const raw = String(packageName || '').trim();
  const parts = raw.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { vendor: parts[0], name: parts[1] };
}

function namespaceFromComposerName(packageName) {
  const parsed = parseComposerName(packageName);
  if (!parsed) return null;
  const vendor = pascalize(parsed.vendor.split(/[^A-Za-z0-9]+/));
  const name = pascalize(parsed.name.split(/[^A-Za-z0-9]+/));
  if (!vendor || !name) return null;
  return `${vendor}\\${name}`;
}

function bundleNameFromNamespace(namespaceRoot) {
  const parts = String(namespaceRoot || '').split('\\').filter(Boolean);
  const base = parts[parts.length - 1] || 'Bridge';
  return `${base}BridgeBundle`;
}

export function createSymfonyTarget() {
  return {
    id: 'symfony',
    capabilities: {
      generate: true,
      build: false,
      dev: false,
    },
    async normalize({ config, mode }) {
      if (!config.packageName) throw new Error('Missing packageName');
      const parsed = parseComposerName(config.packageName);
      if (!parsed) {
        throw new Error('Invalid packageName for Symfony target. Expected "vendor/name".');
      }

      const namespaceRoot = namespaceFromComposerName(config.packageName);
      if (!namespaceRoot) throw new Error('Unable to derive namespace from packageName.');

      const bundleName = bundleNameFromNamespace(namespaceRoot);
      const version = config.version ?? '0.0.0';
      const libName = deriveLibName(config.packageName);

      return {
        ...config,
        namespaceRoot,
        bundleName,
        version,
        libName,
        requiredMode: 'spec',
      };
    },
    async run({ cwd, mode, config, ir, log }) {
      if (mode === 'generate') {
        const projectDir = config.outDir
          ? path.resolve(cwd, config.outDir)
          : path.resolve(cwd, 'projects', config.libName);
        const projectReadmePath = path.join(cwd, 'README.md');

        log.title('generate — bundle files');
        log.info(`repo: ${cwd}`);
        log.info(`package: ${config.packageName}@${config.version}`);
        log.info(`namespace: ${config.namespaceRoot}`);
        log.info(`bundle: ${config.bundleName}`);
        log.info(`target: ${path.relative(cwd, projectDir)}`);
        if (config.noModels) log.info('models: désactivés (--no-models)');
        else log.info(`spec: ${config.specSource} | formats: ${config.formats.join(', ')} | nullableMode: ${config.requiredMode}`);

        await generateSymfonyBridge({
          cwd,
          projectDir,
          config,
          ir,
          debug: config.debug,
          log,
          projectReadmePath,
        });

        log.success(`bridge généré: ${path.relative(cwd, projectDir)}`);
        return;
      }

      if (mode === 'build' || mode === 'dev') {
        throw new NotSupportedError({ target: 'symfony', mode });
      }

      throw new NotSupportedError({ target: 'symfony', mode });
    },
  };
}
