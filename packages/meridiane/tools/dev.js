#!/usr/bin/env node
import process from 'node:process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { deriveLibName } from './core/lib-name.js';
import { splitListArgs } from './core/paths.js';
import { readOpenApiSpec } from './core/spec.js';
import { createLogger } from './core/logger.js';
import { generateBridgeWorkspace } from './core/generate.js';
import { ensureStandaloneWorkspace, ensureToolchainInstalled } from './core/standalone.js';

function run(cmd, args, { cwd, env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: cwd ?? process.cwd(),
      env: env ?? process.env,
    });
    child.on('exit', (code) => resolve(code ?? 0));
  });
}

async function pathIsFile(p) {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

async function readPackageJsonName(dir) {
  try {
    const raw = await fs.readFile(path.join(dir, 'package.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed?.name === 'string' ? parsed.name : undefined;
  } catch {
    return undefined;
  }
}

async function resolveDevAppRoot(startCwd) {
  if (await pathIsFile(path.join(startCwd, 'package.json'))) return startCwd;
  throw new Error('No package.json found. Run `meridiane dev` from your Angular app root.');
}

async function isMeridianeSandboxApp(appRoot) {
  const name = await readPackageJsonName(appRoot);
  return name === '@obsidiane/meridiane-sandbox';
}

async function resolveSandboxAppRoot(startCwd) {
  // Allow running from apps/sandbox directly
  if (await isMeridianeSandboxApp(startCwd)) return startCwd;

  // Allow running from this repo root (monorepo) and target apps/sandbox
  const sandboxApp = path.join(startCwd, 'apps', 'sandbox');
  if (await pathIsFile(path.join(sandboxApp, 'package.json')) && (await isMeridianeSandboxApp(sandboxApp))) {
    return sandboxApp;
  }

  throw new Error('Missing <packageName>. Run from the sandbox app (`apps/sandbox`) or provide a package name.');
}

async function findLatestTgz(distDir) {
  const entries = await fs.readdir(distDir, { withFileTypes: true }).catch(() => []);
  const tgzFiles = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.endsWith('.tgz')) continue;
    const full = path.join(distDir, e.name);
    const st = await fs.stat(full);
    tgzFiles.push({ full, mtimeMs: st.mtimeMs });
  }
  tgzFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return tgzFiles[0]?.full;
}

function splitPackageName(packageName) {
  const s = String(packageName || '').trim();
  if (!s) throw new Error('Missing packageName');
  if (s.startsWith('@')) {
    const [scope, name] = s.split('/');
    if (!scope || !name) throw new Error(`Invalid packageName: ${packageName}`);
    return { scope, name };
  }
  return { scope: undefined, name: s };
}

async function resolveNodeModulesRoot(startDir) {
  let cur = startDir;
  for (;;) {
    const candidate = path.join(cur, 'node_modules');
    try {
      const st = await fs.stat(candidate);
      if (st.isDirectory()) return candidate;
    } catch {
      // ignore
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  const nm = path.join(startDir, 'node_modules');
  await fs.mkdir(nm, { recursive: true });
  return nm;
}

async function installPackageFromDist({ packageName, distDir, appRoot, log }) {
  const nmRoot = await resolveNodeModulesRoot(appRoot);
  const { scope, name } = splitPackageName(packageName);
  const pkgDir = scope ? path.join(nmRoot, scope, name) : path.join(nmRoot, name);

  log?.step?.(`installation locale dans node_modules (${scope ? `${scope}/${name}` : name})`);

  await fs.rm(pkgDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(pkgDir), { recursive: true });

  await fs.cp(distDir, pkgDir, {
    recursive: true,
    filter: (src) => !src.endsWith('.tgz'),
  });

  return pkgDir;
}

export async function runDev(packageName, opts) {
  const startCwd = process.cwd();
  const debug = !!opts.debug;
  const log = createLogger({ debug });

  const useSandboxDefaults = packageName === undefined;
  const appRoot = useSandboxDefaults ? await resolveSandboxAppRoot(startCwd) : await resolveDevAppRoot(startCwd);

  const effectivePackageName = packageName ?? '@obsidiane/bridge-sandbox';
  const libName = deriveLibName(effectivePackageName);

  const noModels = opts.models === false;
  const formats = splitListArgs(opts.formats);
  const include = splitListArgs(opts.include);
  const exclude = splitListArgs(opts.exclude);

  const version = '0.0.0-dev';
  const requiredMode = 'all';
  const effectiveFormats = formats.length > 0 ? formats : ['application/ld+json'];
  const specSource = useSandboxDefaults ? (opts.spec ?? 'http://localhost:8000/api/docs.json') : opts.spec;

  log.title('dev — build standalone + install local');
  log.info(`app: ${appRoot}`);
  log.info(`package: ${effectivePackageName}@${version}`);
  log.info(`lib: ${libName}`);
  if (useSandboxDefaults) log.info('defaults sandbox appliqués');
  if (noModels) log.info('models: désactivés (--no-models)');
  else log.info(`spec: ${specSource} | formats: ${effectiveFormats.join(', ')} | nullableMode: ${requiredMode}`);

  const { workspaceRoot, distRoot, npmCacheDir, requireFromWs } = await ensureStandaloneWorkspace({ repoRoot: appRoot, log });
  log.info(`workspace: ${workspaceRoot}`);

  let spec;
  if (!noModels) {
    log.step('lecture de la spec OpenAPI');
    spec = await readOpenApiSpec(specSource);
    log.success('spec chargée');
  }

  await ensureToolchainInstalled({ workspaceRoot, requireFromWs, npmCacheDir, log });

  await generateBridgeWorkspace({
    cwd: workspaceRoot,
    libName,
    packageName: effectivePackageName,
    version,
    noModels,
    spec,
    requiredMode,
    formats: effectiveFormats,
    include,
    exclude,
    debug,
    log,
    distRoot,
  });

  const ngPackageJsonPath = path.join(workspaceRoot, 'projects', libName, 'ng-package.json');
  const tsconfigDevPath = path.join(workspaceRoot, 'projects', libName, 'tsconfig.lib.json');

  log.step('ng-packagr');
  const ngPackagrPath = requireFromWs.resolve('ng-packagr/src/cli/main.js');
  const packagrCode = await run(process.execPath, [ngPackagrPath, '-p', ngPackageJsonPath, '-c', tsconfigDevPath], {
    cwd: workspaceRoot,
  });
  if (packagrCode !== 0) process.exit(packagrCode);

  const distDir = path.join(distRoot, libName);
  log.step(`npm pack (${path.relative(appRoot, distDir)})`);
  const packCode = await run('npm', ['pack'], {
    cwd: distDir,
    env: {
      ...process.env,
      npm_config_cache: npmCacheDir,
      npm_config_update_notifier: 'false',
      npm_config_fund: 'false',
      npm_config_audit: 'false',
    },
  });
  if (packCode !== 0) process.exit(packCode);

  await findLatestTgz(distDir); // keep producing the tgz in dist for inspection/use
  await installPackageFromDist({ packageName: effectivePackageName, distDir, appRoot, log });

  log.success('bridge installé (node_modules) ✅');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  throw new Error('This module is not meant to be executed directly.');
}
