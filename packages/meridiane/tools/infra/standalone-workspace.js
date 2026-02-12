import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

import { runCommand } from './exec.js';
import { writeJsonIfChanged } from './json.js';

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function toolchainPackageJson({ angularVersion, ngPackagrVersion, typescriptVersion, rxjsVersion, tslibVersion }) {
  const v = angularVersion;
  return {
    name: 'meridiane-standalone-workspace',
    private: true,
    description: 'Temporary workspace created by @obsidiane/meridiane (standalone build).',
    devDependencies: {
      '@angular/common': v,
      '@angular/compiler': v,
      '@angular/compiler-cli': v,
      '@angular/core': v,
      'ng-packagr': ngPackagrVersion,
      rxjs: rxjsVersion,
      tslib: tslibVersion,
      typescript: typescriptVersion,
    },
  };
}

function rootTsconfigJson() {
  return {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      // Angular >=21 relies on modern package exports resolution for some subpaths
      // (e.g. @angular/common/http, @angular/core/rxjs-interop).
      moduleResolution: 'bundler',
      lib: ['ES2022', 'DOM'],
      strict: true,
      skipLibCheck: true,
      experimentalDecorators: true,
      importHelpers: true,
    },
    angularCompilerOptions: {
      compilationMode: 'partial',
      strictTemplates: true,
    },
  };
}

export async function ensureStandaloneWorkspace({ repoRoot, log }) {
  const distRoot = path.join(repoRoot, 'dist');
  const workspaceRoot = path.join(distRoot, '.meridiane-workspace');

  await ensureDir(distRoot);
  await ensureDir(workspaceRoot);

  const detected = await detectToolchainVersions(repoRoot);
  const angularVersion = detected.angularVersion ?? '21.1.4';
  const derived = deriveToolchainDefaultsFromAngular(angularVersion);
  const ngPackagrVersion = detected.ngPackagrVersion ?? derived.ngPackagrVersion;
  const typescriptVersion = detected.typescriptVersion ?? derived.typescriptVersion;
  const rxjsVersion = detected.rxjsVersion ?? '7.8.2';
  const tslibVersion = detected.tslibVersion ?? '2.8.1';
  log?.debug?.('[meridiane] angular version', { angularVersion });
  await writeJsonIfChanged(
    path.join(workspaceRoot, 'package.json'),
    toolchainPackageJson({ angularVersion, ngPackagrVersion, typescriptVersion, rxjsVersion, tslibVersion })
  );
  await writeJsonIfChanged(path.join(workspaceRoot, 'tsconfig.json'), rootTsconfigJson());

  const npmCacheDir = path.join(workspaceRoot, '.npm-cache');
  await ensureDir(npmCacheDir);

  const requireFromWs = createRequire(path.join(workspaceRoot, 'package.json'));

  return { workspaceRoot, distRoot, npmCacheDir, requireFromWs };
}

async function detectToolchainVersions(repoRoot) {
  const pkgPath = path.join(repoRoot, 'package.json');
  try {
    const raw = await fs.readFile(pkgPath, 'utf8');
    const parsed = JSON.parse(raw);
    const angularVersion = readDependencyVersion(parsed, '@angular/core');
    const ngPackagrVersion = readDependencyVersion(parsed, 'ng-packagr');
    const typescriptVersion = readDependencyVersion(parsed, 'typescript');
    const rxjsVersion = readDependencyVersion(parsed, 'rxjs');
    const tslibVersion = readDependencyVersion(parsed, 'tslib');
    return { angularVersion, ngPackagrVersion, typescriptVersion, rxjsVersion, tslibVersion };
  } catch {
    return {};
  }
}

function readDependencyVersion(pkg, depName) {
  const deps = pkg?.dependencies || {};
  const devDeps = pkg?.devDependencies || {};
  const peerDeps = pkg?.peerDependencies || {};
  const value = deps[depName] ?? devDeps[depName] ?? peerDeps[depName];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function deriveToolchainDefaultsFromAngular(angularVersion) {
  const major = parseInt(String(angularVersion).match(/\d+/)?.[0] ?? '0', 10);
  if (major >= 21) {
    return {
      ngPackagrVersion: '21.1.0',
      typescriptVersion: '5.9.3',
    };
  }
  return {
    ngPackagrVersion: '20.1.0',
    typescriptVersion: '5.8.3',
  };
}

export async function ensureToolchainInstalled({ workspaceRoot, requireFromWs, npmCacheDir, log }) {
  // Prefer using existing (hoisted) deps during local dev; in CI this will trigger installation.
  const canResolve = (id) => {
    try {
      requireFromWs.resolve(id);
      return true;
    } catch {
      return false;
    }
  };

  if (canResolve('ng-packagr/package.json')) return false;

  log?.step?.('installation du toolchain (Angular + ng-packagr)');

  // Use npm with a local cache to avoid writing to ~/.npm.
  const env = {
    ...process.env,
    npm_config_cache: npmCacheDir,
    npm_config_update_notifier: 'false',
    npm_config_fund: 'false',
    npm_config_audit: 'false',
  };

  // We avoid generating a lockfile in the backend repo by keeping everything under dist/.
  const npmCmd = 'npm';
  const args = ['install', '--silent', '--no-progress'];
  const code = await runCommand(npmCmd, args, { cwd: workspaceRoot, env });

  if (code !== 0) throw new Error(`Toolchain install failed (npm exit ${code})`);
  if (!(await exists(path.join(workspaceRoot, 'node_modules')))) {
    throw new Error('Toolchain install failed: node_modules missing');
  }
  return true;
}
