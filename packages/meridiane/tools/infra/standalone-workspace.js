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

function toolchainPackageJson({ angularVersion }) {
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
      'ng-packagr': '20.1.0',
      rxjs: '7.8.2',
      tslib: '2.8.1',
      typescript: '5.8.3',
    },
  };
}

function rootTsconfigJson() {
  return {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'Node',
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

  const angularVersion = (await detectAngularVersion(repoRoot)) ?? '20.1.7';
  log?.debug?.('[meridiane] angular version', { angularVersion });
  await writeJsonIfChanged(path.join(workspaceRoot, 'package.json'), toolchainPackageJson({ angularVersion }));
  await writeJsonIfChanged(path.join(workspaceRoot, 'tsconfig.json'), rootTsconfigJson());

  const npmCacheDir = path.join(workspaceRoot, '.npm-cache');
  await ensureDir(npmCacheDir);

  const requireFromWs = createRequire(path.join(workspaceRoot, 'package.json'));

  return { workspaceRoot, distRoot, npmCacheDir, requireFromWs };
}

async function detectAngularVersion(repoRoot) {
  const pkgPath = path.join(repoRoot, 'package.json');
  try {
    const raw = await fs.readFile(pkgPath, 'utf8');
    const parsed = JSON.parse(raw);
    const deps = parsed?.dependencies || {};
    const devDeps = parsed?.devDependencies || {};
    const peerDeps = parsed?.peerDependencies || {};
    const v = deps['@angular/core'] ?? devDeps['@angular/core'] ?? peerDeps['@angular/core'];
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
  } catch {
    return undefined;
  }
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
