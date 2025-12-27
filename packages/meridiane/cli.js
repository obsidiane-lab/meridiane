#!/usr/bin/env node
import process from 'node:process';
import { Command } from 'commander';

import { runDev } from './tools/dev.js';
import { runBuild } from './tools/build.js';
import { runGenerate } from './tools/generate.js';
import { createLogger } from './tools/infra/logger.js';

const program = new Command();

program.name('meridiane').description('Generate an Angular bridge + models from an API Platform OpenAPI spec.').showHelpAfterError().showSuggestionAfterError();

function collect(value, previous = []) {
  return [...previous, value];
}

function commonOptions(cmd) {
  return cmd
    .option('--spec <urlOrFile>', 'OpenAPI spec source (URL or local JSON file)')
    .option(
      '--formats <mimeTypes>',
      'Generate only selected media types (repeatable, supports commas). Enables contract-driven mode from paths.',
      collect,
      []
    )
    .option('--include <substr>', 'Include schema names containing substring (repeatable, supports commas)', collect, [])
    .option('--exclude <substr>', 'Exclude schema names containing substring (repeatable, supports commas)', collect, [])
    .option('--no-models', 'Skip models generation (then --spec is not required)')
    .option('--debug', 'Enable debug logs');
}

commonOptions(
  program
    .command('dev')
    .argument(
      '[packageName]',
      'NPM package name of the generated bridge (e.g. @acme/backend-bridge). Optional in this repo (defaults to @obsidiane/bridge-sandbox).'
    )
    .action(async (packageName, opts) => {
      const log = createLogger({ debug: !!opts?.debug });
      try {
        const exitCode = await runDev(packageName, opts);
        if (typeof exitCode === 'number' && exitCode !== 0) process.exit(exitCode);
      } catch (err) {
        log.error(err);
        const exitCode = typeof err?.exitCode === 'number' ? err.exitCode : 1;
        process.exit(exitCode);
      }
    })
);

commonOptions(
  program
    .command('build')
    .argument('<packageName>', 'NPM package name of the generated bridge (e.g. @acme/backend-bridge)')
    .option('--version <semver>', 'Version to write in the generated bridge package.json (CI/CD)')
    .action(async (packageName, opts) => {
      const log = createLogger({ debug: !!opts?.debug });
      try {
        const exitCode = await runBuild(packageName, opts);
        if (typeof exitCode === 'number' && exitCode !== 0) process.exit(exitCode);
      } catch (err) {
        log.error(err);
        const exitCode = typeof err?.exitCode === 'number' ? err.exitCode : 1;
        process.exit(exitCode);
      }
    })
);

commonOptions(
  program
    .command('generate')
    .argument('<packageName>', 'NPM package name of the generated bridge (e.g. @acme/backend-bridge)')
    .option('--version <semver>', 'Version to write in the generated bridge package.json')
    .option('--out <dir>', 'Output directory (default: projects/<libName>)')
    .action(async (packageName, opts) => {
      const log = createLogger({ debug: !!opts?.debug });
      try {
        const exitCode = await runGenerate(packageName, opts);
        if (typeof exitCode === 'number' && exitCode !== 0) process.exit(exitCode);
      } catch (err) {
        log.error(err);
        const exitCode = typeof err?.exitCode === 'number' ? err.exitCode : 1;
        process.exit(exitCode);
      }
    })
);

program.parse(process.argv);
