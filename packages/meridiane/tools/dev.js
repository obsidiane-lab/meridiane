#!/usr/bin/env node
import process from 'node:process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { deriveLibName } from './core/lib-name.js';
import { assertAngularWorkspace, normalizePreset, splitListArgs } from './core/paths.js';
import { readOpenApiSpec } from './core/spec.js';
import { createLogger } from './core/logger.js';
import { generateBridgeWorkspace } from './core/generate.js';

async function pathIsFile(p) {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

async function pathIsDir(p) {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function readPackageJsonName(workspaceRoot) {
  try {
    const raw = await fs.readFile(path.join(workspaceRoot, 'package.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed?.name === 'string' ? parsed.name : undefined;
  } catch {
    return undefined;
  }
}

async function isMeridianeSandboxWorkspace(workspaceRoot) {
  const hasSandboxProject = await pathIsDir(path.join(workspaceRoot, 'projects', 'sandbox'));
  if (!hasSandboxProject) return false;
  const name = await readPackageJsonName(workspaceRoot);
  return name === '@obsidiane/meridiane-sandbox';
}

async function resolveAngularWorkspaceRoot(startCwd) {
  if (await pathIsFile(path.join(startCwd, 'angular.json'))) return { workspaceRoot: startCwd };

  const sandboxWorkspace = path.join(startCwd, 'apps', 'sandbox');
  if (await pathIsFile(path.join(sandboxWorkspace, 'angular.json'))) return { workspaceRoot: sandboxWorkspace };

  throw new Error(
    'No angular.json found. Run Meridiane from an Angular workspace root (or from this repo root containing apps/sandbox).'
  );
}

export async function runDev(packageName, opts) {
  const startCwd = process.cwd();
  const { workspaceRoot } = await resolveAngularWorkspaceRoot(startCwd);
  await assertAngularWorkspace(workspaceRoot);

  const debug = !!opts.debug;
  const log = createLogger({ debug });

  const useSandboxDefaults = packageName === undefined;
  if (useSandboxDefaults && !(await isMeridianeSandboxWorkspace(workspaceRoot))) {
    throw new Error('Missing <packageName>. In a non-sandbox workspace, you must provide a package name.');
  }

  const effectivePackageName = packageName ?? '@obsidiane/bridge-sandbox';
  const libName = deriveLibName(effectivePackageName);

  const noModels = opts.models === false;
  const preset = normalizePreset(useSandboxDefaults ? (opts.preset ?? 'native') : opts.preset);
  const include = splitListArgs(opts.include);
  const exclude = splitListArgs(opts.exclude);

  const version = '0.0.0-dev';
  const requiredMode = 'all-optional';

  log.title('dev — mise à jour du bridge');
  log.info(`workspace: ${workspaceRoot}`);
  log.info(`package: ${effectivePackageName}`);
  log.info(`lib: projects/${libName}`);
  if (useSandboxDefaults) log.info('defaults sandbox appliqués');
  if (noModels) log.info('models: désactivés (--no-models)');
  const specSource = useSandboxDefaults ? (opts.spec ?? 'http://localhost:8000/api/docs.json') : opts.spec;
  if (!noModels) log.info(`spec: ${specSource} | preset: ${preset}`);

  let spec;
  if (!noModels) {
    log.step('lecture de la spec OpenAPI');
    spec = await readOpenApiSpec(specSource);
    log.success('spec chargée');
  }

  await generateBridgeWorkspace({
    cwd: workspaceRoot,
    libName,
    packageName: effectivePackageName,
    version,
    noModels,
    spec,
    requiredMode,
    preset,
    include,
    exclude,
    debug,
    log,
  });

  log.success('bridge à jour');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  throw new Error('This module is not meant to be executed directly.');
}
