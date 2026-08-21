import fs from 'node:fs/promises';
import path from 'node:path';

function splitPackageName(packageName) {
  const normalized = String(packageName || '').trim();
  if (!normalized) throw new Error('Missing packageName');
  if (!normalized.startsWith('@')) return {name: normalized};

  const [scope, name] = normalized.split('/');
  if (!scope || !name) throw new Error(`Invalid packageName: ${packageName}`);
  return {scope, name};
}

async function findNodeModules(startDir) {
  let currentDir = startDir;

  while (true) {
    const candidate = path.join(currentDir, 'node_modules');
    try {
      if ((await fs.stat(candidate)).isDirectory()) return candidate;
    } catch {
      // Continue towards the filesystem root.
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  const nodeModules = path.join(startDir, 'node_modules');
  await fs.mkdir(nodeModules, {recursive: true});
  return nodeModules;
}

export async function installPackageFromDist({packageName, distDir, appRoot, log}) {
  const nodeModules = await findNodeModules(appRoot);
  const {scope, name} = splitPackageName(packageName);
  const packageDir = scope ? path.join(nodeModules, scope, name) : path.join(nodeModules, name);
  const displayName = scope ? `${scope}/${name}` : name;

  log?.step?.(`installation locale dans node_modules (${displayName})`);

  await fs.rm(packageDir, {recursive: true, force: true});
  await fs.mkdir(path.dirname(packageDir), {recursive: true});
  await fs.cp(distDir, packageDir, {
    recursive: true,
    filter: (source) => !source.endsWith('.tgz'),
  });

  await invalidateAngularViteCache({appRoot, packageName, log});
  return packageDir;
}

async function invalidateAngularViteCache({appRoot, packageName, log}) {
  const dependencyCaches = await findViteDependencyCaches(appRoot);
  if (dependencyCaches.length === 0) return;

  const packageCacheName = packageName.replace('/', '_');
  const generatedFiles = ['.js', '.js.map', '.mjs', '.mjs.map'].map((suffix) => `${packageCacheName}${suffix}`);
  let removedFiles = 0;

  for (const cacheDir of dependencyCaches) {
    for (const fileName of [...generatedFiles, '_metadata.json']) {
      try {
        await fs.rm(path.join(cacheDir, fileName), {force: true});
        removedFiles += 1;
      } catch {
        // A stale cache file may disappear between discovery and deletion.
      }
    }
  }

  if (removedFiles > 0) {
    log?.info?.(`cache Angular/Vite invalidé (${removedFiles} fichier(s)) pour ${packageName}`);
  }
}

async function findViteDependencyCaches(appRoot) {
  const cacheRoot = path.join(appRoot, '.angular', 'cache');
  const dependencyCaches = [];

  async function visit(dir, depth) {
    if (depth > 8) return;

    let entries;
    try {
      entries = await fs.readdir(dir, {withFileTypes: true});
    } catch {
      return;
    }

    if (path.basename(dir) === 'vite' && entries.some((entry) => entry.isDirectory() && entry.name === 'deps')) {
      dependencyCaches.push(path.join(dir, 'deps'));
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'node_modules') continue;
      await visit(path.join(dir, entry.name), depth + 1);
    }
  }

  await visit(cacheRoot, 0);
  return dependencyCaches;
}
