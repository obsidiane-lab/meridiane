import fs from 'node:fs/promises';
import path from 'node:path';

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

async function isMeridianeSandboxApp(appRoot) {
  const name = await readPackageJsonName(appRoot);
  return name === '@obsidiane/meridiane-sandbox';
}

export async function resolveDevAppRoot(startCwd) {
  if (await pathIsFile(path.join(startCwd, 'package.json'))) return startCwd;
  throw new Error('No package.json found. Run `meridiane dev` from your Angular app root.');
}

export async function resolveSandboxAppRoot(startCwd) {
  if (await isMeridianeSandboxApp(startCwd)) return startCwd;

  const sandboxApp = path.join(startCwd, 'apps', 'sandbox');
  if (await pathIsFile(path.join(sandboxApp, 'package.json')) && (await isMeridianeSandboxApp(sandboxApp))) {
    return sandboxApp;
  }

  throw new Error('Missing <packageName>. Run from the sandbox app (`apps/sandbox`) or provide a package name.');
}

export async function resolveSpecSource({ useSandboxDefaults, appRoot, specArg }) {
  if (!useSandboxDefaults) return specArg;
  if (specArg) return specArg;
  const localSpec = path.resolve(appRoot, '..', 'backend', 'var', 'openapi.json');
  return (await pathIsFile(localSpec)) ? localSpec : 'http://localhost:8000/api/docs.json';
}

export async function findLatestTgz(distDir) {
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

export async function installPackageFromDist({ packageName, distDir, appRoot, log }) {
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

  await invalidateAngularViteDependencyCache({ appRoot, packageName, log });

  return pkgDir;
}

async function invalidateAngularViteDependencyCache({ appRoot, packageName, log }) {
  const viteDepsRoots = await findAngularViteDepsRoots(appRoot);
  if (viteDepsRoots.length === 0) return;

  const cacheBase = packageNameToViteCacheBase(packageName);
  let removed = 0;

  for (const depsRoot of viteDepsRoots) {
    const files = [
      `${cacheBase}.js`,
      `${cacheBase}.js.map`,
      `${cacheBase}.mjs`,
      `${cacheBase}.mjs.map`,
    ];

    for (const fileName of files) {
      const p = path.join(depsRoot, fileName);
      try {
        await fs.rm(p, { force: true });
        removed += 1;
      } catch {
        // ignore
      }
    }

    // Metadata keeps dependency hashes/entries; remove it to force a clean re-optimization.
    try {
      await fs.rm(path.join(depsRoot, '_metadata.json'), { force: true });
      removed += 1;
    } catch {
      // ignore
    }
  }

  if (removed > 0) {
    log?.info?.(`cache Angular/Vite invalidé (${removed} fichier(s)) pour ${packageName}`);
  }
}

function packageNameToViteCacheBase(packageName) {
  const normalized = String(packageName || '').trim();
  // Example: "@obsidiane/bridge-sandbox" -> "@obsidiane_bridge-sandbox"
  return normalized.replace('/', '_');
}

async function findAngularViteDepsRoots(appRoot) {
  const angularCacheRoot = path.join(appRoot, '.angular', 'cache');
  const roots = [];

  async function walk(dir, depth) {
    if (depth > 8) return;

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const hasDeps = entries.some((e) => e.isDirectory() && e.name === 'deps');
    if (hasDeps && path.basename(dir) === 'vite') {
      roots.push(path.join(dir, 'deps'));
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules') continue;
      await walk(path.join(dir, entry.name), depth + 1);
    }
  }

  await walk(angularCacheRoot, 0);
  return roots;
}
