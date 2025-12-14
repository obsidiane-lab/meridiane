#!/usr/bin/env node
import process from 'node:process';
import { Command } from 'commander';

import { runDev } from './tools/dev.js';
import { runBuild } from './tools/build.js';

const program = new Command();

program
  .name('meridiane')
  .description('Generate an Angular bridge + models from an API Platform OpenAPI spec.')
  .showHelpAfterError()
  .showSuggestionAfterError();

function presetParser(value, previous) {
  if (value === undefined && previous === undefined) return true; // `--preset` (no value) => native
  return value ?? previous;
}

function collect(value, previous = []) {
  return [...previous, value];
}

function commonOptions(cmd) {
  return cmd
    .option('--spec <urlOrFile>', 'OpenAPI spec source (URL or local JSON file)')
    .option('--preset [mode]', 'Preset: native|all (default: all; `--preset` alone => native)', presetParser)
    .option('--include <substr>', 'Include schema names containing substring (repeatable, supports commas)', collect, [])
    .option('--exclude <substr>', 'Exclude schema names containing substring (repeatable, supports commas)', collect, [])
    .option('--no-models', 'Skip models generation (then --spec is not required)')
    .option('--debug', 'Enable debug logs');
}

commonOptions(
  program
    .command('dev')
    .argument('<packageName>', 'NPM package name of the generated bridge (e.g. @acme/backend-bridge)')
    .action(async (packageName, opts) => {
      try {
        await runDev(packageName, opts);
      } catch (err) {
        console.error(err?.message ?? err);
        process.exit(1);
      }
    })
);

commonOptions(
  program
    .command('build')
    .argument('<packageName>', 'NPM package name of the generated bridge (e.g. @acme/backend-bridge)')
    .requiredOption('--version <semver>', 'Version to write in the generated bridge package.json (CI/CD)')
    .action(async (packageName, opts) => {
      try {
        await runBuild(packageName, opts);
      } catch (err) {
        console.error(err?.message ?? err);
        process.exit(1);
      }
    })
);

program.parse(process.argv);
