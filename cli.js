#!/usr/bin/env node
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runTool(scriptName, args) {
  const scriptPath = path.join(__dirname, 'projects', 'tools', scriptName);
  const child = spawn(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

function printHelp() {
  console.log(`
Usage:
  meridiane lib <lib-name> <npm-package-name> [version] <url-registry>
  meridiane models <SPEC_OPENAPI_URL_OU_FICHIER_JSON> [options]

Examples:
  meridiane lib backend-bridge @acme/backend-bridge 0.1.0 https://gitlab.com/api/v4/projects/12345678910/packages/npm/
  meridiane models http://localhost:8000/api/docs.json --out=projects/backend-bridge/src/models
`);
}

const [, , cmd, ...rest] = process.argv;

switch (cmd) {
  case 'lib':
    runTool('generate-lib.js', rest);
    break;
  case 'models':
    runTool('generate-models.js', rest);
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

