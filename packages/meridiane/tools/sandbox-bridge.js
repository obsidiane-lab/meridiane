#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {loadDotEnv} from './utils/dotenv.js';
import {getArg, hasFlag} from './utils/cli-args.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {stdio: 'inherit', env: process.env});
    child.on('exit', (code) => resolve(code ?? 0));
  });
}

function printHelp() {
  console.log(`
Usage:
  meridiane sandbox-bridge [options]

This command regenerates the Angular bridge library used by the sandbox:
  - workspace: apps/sandbox
  - libName: bridge-sandbox
  - package: @obsidiane/bridge-sandbox
  - version: 0.1.0 (override with --version)

Options:
  --backend=http://localhost:8000
  --spec=/api/docs.json
  --models-out=projects/bridge-sandbox/src/models
  --required-mode=all-optional|spec
  --preset=all|native
  --include=<substr>[,<substr>…] (repeatable)
  --exclude=<substr>[,<substr>…] (repeatable)
  --index=1|0
  --no-models
  --debug

Example:
  npx -y @obsidiane/meridiane sandbox-bridge --backend=http://localhost:8000
`);
}

async function main() {
  await loadDotEnv();

  if (hasFlag('help') || hasFlag('h')) {
    printHelp();
    process.exit(0);
  }

  const version = getArg('version', process.env.MERIDIANE_SANDBOX_BRIDGE_VERSION ?? '0.1.0');

  const passThrough = process.argv.slice(2).filter((a) => a.startsWith('--') && !a.startsWith('--version='));

  const devBridgePath = path.join(__dirname, 'dev-bridge.js');
  const workspaceAbs = path.join(repoRoot, 'apps', 'sandbox');
  const args = [
    devBridgePath,
    'bridge-sandbox',
    '@obsidiane/bridge-sandbox',
    version,
    `--workspace=${workspaceAbs}`,
    ...passThrough,
  ];

  const code = await run(args);
  process.exit(code);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
