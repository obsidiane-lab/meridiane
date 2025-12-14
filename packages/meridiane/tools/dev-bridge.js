#!/usr/bin/env node
import process from 'node:process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {loadDotEnv} from './utils/dotenv.js';
import {getArg, getArgs, hasFlag} from './utils/cli-args.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeBaseUrl(u) {
  if (!u) return u;
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

function joinUrl(base, p) {
  const b = normalizeBaseUrl(base);
  if (!b) return p;
  if (/^https?:\/\//i.test(p)) return p;
  if (!p.startsWith('/')) return `${b}/${p}`;
  return `${b}${p}`;
}

function runNode(scriptPath, args, {cwd} = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: 'inherit',
      env: process.env,
      cwd: cwd ?? process.cwd(),
    });
    child.on('exit', (code) => resolve(code ?? 0));
  });
}

function printHelp() {
  console.log(`
Usage:
  meridiane dev-bridge <lib-name> <npm-package-name> [version]

Options:
  --workspace=apps/sandbox               Working directory (default: current directory)
  --backend=http://localhost:8000        Base URL of the backend (default: http://localhost:8000)
  --spec=/api/docs.json                  Spec path or full URL (default: /api/docs.json)
  --models-out=projects/<lib>/src/models Output dir for generated models
  --required-mode=all-optional|spec      Models required-mode (default: all-optional)
  --preset=all|native                    Models preset (default: all)
  --include=<substr>[,<substr>…]         Include schema names (repeatable)
  --exclude=<substr>[,<substr>…]         Exclude schema names (repeatable)
  --index=1|0                             Generate index.ts (default: 1)
  --no-models                            Skip models generation
  --debug                                Enable debug logs

Examples:
  npx -y @obsidiane/meridiane dev-bridge bridge-sandbox @obsidiane/bridge-sandbox 0.1.0
  npx -y @obsidiane/meridiane dev-bridge bridge-sandbox @obsidiane/bridge-sandbox 0.1.0 --workspace=apps/sandbox
  npx -y @obsidiane/meridiane dev-bridge backend-bridge @acme/backend-bridge 0.1.0 --backend=http://localhost:8000 --workspace=apps/sandbox
`);
}

async function main() {
  await loadDotEnv();

  const debug = hasFlag('debug') || /^(1|true|yes)$/i.test(process.env.MERIDIANE_DEBUG ?? '');
  if (debug) process.env.MERIDIANE_DEBUG = '1';

  const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const [libName, packageName, versionArg] = positional;
  if (!libName || !packageName) {
    printHelp();
    process.exit(1);
  }

  const workspaceArg = getArg('workspace', process.env.MERIDIANE_DEV_WORKSPACE ?? '.');
  const workspaceDir = path.resolve(process.cwd(), workspaceArg);

  const backend = normalizeBaseUrl(getArg('backend', process.env.MERIDIANE_DEV_BACKEND ?? 'http://localhost:8000'));
  const specArg = getArg('spec', process.env.MERIDIANE_DEV_SPEC ?? '/api/docs.json');
  const specUrl = /^https?:\/\//i.test(specArg) ? specArg : joinUrl(backend, specArg);

  const version = versionArg ?? process.env.MERIDIANE_LIB_VERSION ?? '0.0.1';
  const urlRegistry = getArg('registry', process.env.MERIDIANE_NPM_REGISTRY_URL);

  const toolsDir = __dirname;
  const genLib = path.join(toolsDir, 'generate-lib.js');
  const genModels = path.join(toolsDir, 'generate-models.js');

  if (debug) {
    console.log('[meridiane dev-bridge] config', {
      workspaceDir,
      backend,
      specUrl,
      libName,
      packageName,
      version,
      urlRegistry: urlRegistry ? '<set>' : '<unset>',
    });
  }

  // 1) Regenerate the library skeleton.
  const libArgs = [libName, packageName, version, ...(urlRegistry ? [urlRegistry] : [])];
  const libCode = await runNode(genLib, libArgs, {cwd: workspaceDir});
  if (libCode !== 0) process.exit(libCode);

  // 2) Generate models from the backend spec (dev-only convenience).
  if (hasFlag('no-models')) return;

  const modelsOut = getArg('models-out', `projects/${libName}/src/models`);
  const requiredMode = getArg('required-mode', process.env.MERIDIANE_MODELS_REQUIRED_MODE ?? 'all-optional');
  const preset = getArg('preset', process.env.MERIDIANE_MODELS_PRESET);
  const include = getArgs('include');
  const exclude = getArgs('exclude');
  const index = getArg('index', process.env.MERIDIANE_MODELS_INDEX);

  const modelsArgs = [
    specUrl,
    `--out=${modelsOut}`,
    `--required-mode=${requiredMode}`,
    ...(preset ? [`--preset=${preset}`] : []),
    ...include.map((v) => `--include=${v}`),
    ...exclude.map((v) => `--exclude=${v}`),
    ...(index ? [`--index=${index}`] : []),
  ];

  // Try the configured URL first, then fallback to API Platform alternative endpoint.
  let modelsCode = await runNode(genModels, modelsArgs, {cwd: workspaceDir});
  if (modelsCode !== 0 && specUrl.endsWith('/api/docs.json')) {
    const fallback = specUrl.replace(/\/api\/docs\.json$/, '/api/docs.jsonopenapi');
    console.warn(`⚠️  Models generation failed for ${specUrl}, retrying with ${fallback}`);
    modelsCode = await runNode(genModels, [fallback, ...modelsArgs.slice(1)], {cwd: workspaceDir});
  }

  process.exit(modelsCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
