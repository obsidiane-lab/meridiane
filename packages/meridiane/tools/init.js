#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function boolFromEnv(name) {
  return /^(1|true|yes)$/i.test(process.env[name] ?? '');
}

async function writeFileIfMissing(filePath, content, {force} = {}) {
  const exists = await fs.pathExists(filePath);
  if (exists && !force) return {written: false, reason: 'exists'};
  await fs.outputFile(filePath, content, 'utf8');
  return {written: true};
}

async function copyFileIfMissing(src, dest, {force} = {}) {
  const exists = await fs.pathExists(dest);
  if (exists && !force) return {written: false, reason: 'exists'};
  await fs.copy(src, dest, {overwrite: true});
  return {written: true};
}

async function main() {
  const force = hasFlag('force');
  const debug = boolFromEnv('MERIDIANE_DEBUG') || hasFlag('debug');

  const cwd = process.cwd();
  const pkgRoot = path.resolve(__dirname, '..');

  const outDir = path.resolve(cwd, 'meridiane');
  await fs.ensureDir(outDir);

  const modelsExample = path.join(pkgRoot, 'models.config.example.js');
  const modelsOut = path.resolve(cwd, 'models.config.js');
  const envExampleOut = path.resolve(cwd, '.env.example');

  const angularExampleOut = path.join(outDir, 'angular.example.ts');
  const readmeOut = path.join(outDir, 'README.md');

  if (debug) console.log('[meridiane init] cwd=', cwd);

  const copiedCfg = await copyFileIfMissing(modelsExample, modelsOut, {force});
  const wroteEnv = await writeFileIfMissing(
    envExampleOut,
    [
      '# Meridiane (CLI) - exemple de configuration',
      '# Copiez en `.env` pour activer la config locale.',
      '',
      '# Logs',
      'MERIDIANE_DEBUG=0',
      '',
      '# meridiane lib',
      '# MERIDIANE_LIB_VERSION=0.1.0',
      '# MERIDIANE_NPM_REGISTRY_URL=https://registry.npmjs.org/',
      '',
      '# meridiane models',
      '# MERIDIANE_MODELS_OUT=projects/backend-bridge/src/models',
      '# MERIDIANE_MODELS_REQUIRED_MODE=spec',
      '# MERIDIANE_MODELS_ITEM_IMPORT=../lib/ports/resource-repository.port',
      '# MERIDIANE_MODELS_NO_INDEX=0',
      '',
      '# Runtime (Angular) - à recopier dans provideBridge(...)',
      '# MERIDIANE_API_BASE_URL=http://localhost:8000',
      '# MERIDIANE_MERCURE_HUB_URL=http://localhost:8000/.well-known/mercure',
      '',
    ].join('\n'),
    {force}
  );

  const wroteAngular = await writeFileIfMissing(
    angularExampleOut,
    [
      "import {provideBridge} from '@acme/backend-bridge';",
      '',
      'export const BRIDGE_PROVIDERS = [',
      '  provideBridge({',
      "    baseUrl: 'http://localhost:8000',",
      '    mercure: {',
      "      hubUrl: 'http://localhost:8000/.well-known/mercure',",
      "      init: {credentials: 'include'},",
      '    },',
      '    defaults: {',
      '      headers: {',
      "        // 'X-Correlation-Id': crypto.randomUUID(),",
      '      },',
      '      timeoutMs: 30_000,',
      '      retries: {count: 1, delayMs: 250},',
      '    },',
      '    // auth: {type: \"bearer\", token: \"<JWT>\"},',
      '    debug: false,',
      '  }),',
      '];',
      '',
    ].join('\n'),
    {force}
  );

  const wroteReadme = await writeFileIfMissing(
    readmeOut,
    [
      '# Meridiane – fichiers générés',
      '',
      'Ces fichiers sont créés par `meridiane init` pour accélérer l’intégration.',
      '',
      '## CLI',
      '',
      '- `models.config.js` : configuration par défaut de `meridiane models` (chargée depuis le CWD).',
      "- `.env` : optionnel. Le CLI charge automatiquement `.env` (CWD) avant d'exécuter `lib/models`.",
      '',
      '## Angular',
      '',
      '- `angular.example.ts` : exemple `provideBridge({ baseUrl, mercure, defaults, auth, debug })` à adapter.',
      '',
    ].join('\n'),
    {force}
  );

  console.log('✅ meridiane init');
  console.log(`- ${path.relative(cwd, modelsOut)} ${copiedCfg.written ? 'créé' : '(existe déjà)'}`);
  console.log(`- ${path.relative(cwd, envExampleOut)} ${wroteEnv.written ? 'créé' : '(existe déjà)'}`);
  console.log(`- ${path.relative(cwd, angularExampleOut)} ${wroteAngular.written ? 'créé' : '(existe déjà)'}`);
  console.log(`- ${path.relative(cwd, readmeOut)} ${wroteReadme.written ? 'créé' : '(existe déjà)'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

