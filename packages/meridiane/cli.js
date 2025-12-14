#!/usr/bin/env node
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runTool(scriptName, args) {
  const scriptPath = path.join(__dirname, 'tools', scriptName);
  const child = spawn(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

function printHelp() {
  console.log(`
Usage:
  meridiane init [--force]
  meridiane lib <lib-name> <npm-package-name> [version] [url-registry]
  meridiane models <SPEC_OPENAPI_URL_OU_FICHIER_JSON> [options]
  meridiane dev-bridge <lib-name> <npm-package-name> [version] [options]
  meridiane sandbox-bridge [options]

Options:
  --debug  Active les logs (CLI et runtime)

Examples:
  npx -y @obsidiane/meridiane init
  npx -y @obsidiane/meridiane lib backend-bridge @acme/backend-bridge 0.1.0
  npx -y @obsidiane/meridiane models http://localhost:8000/api/docs.json --out=projects/backend-bridge/src/models
  npx -y @obsidiane/meridiane dev-bridge bridge-sandbox @obsidiane/bridge-sandbox 0.1.0
  npx -y @obsidiane/meridiane sandbox-bridge
`);
}

const argv = process.argv.slice(2);
const debugIndex = argv.indexOf('--debug');
if (debugIndex >= 0) {
  argv.splice(debugIndex, 1);
  process.env.MERIDIANE_DEBUG = process.env.MERIDIANE_DEBUG || '1';
}

const [cmd, ...rest] = argv;

switch (cmd) {
  case 'init':
    runTool('init.js', rest);
    break;
  case 'lib':
    runTool('generate-lib.js', rest);
    break;
  case 'models':
    runTool('generate-models.js', rest);
    break;
  case 'dev-bridge':
    runTool('dev-bridge.js', rest);
    break;
  case 'sandbox-bridge':
    runTool('sandbox-bridge.js', rest);
    break;
  case '-h':
  case '--help':
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
}
