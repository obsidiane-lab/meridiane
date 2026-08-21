import fs from 'node:fs/promises';
import path from 'node:path';

const SANDBOX_PACKAGE_NAME = '@obsidiane/meridiane-sandbox';

async function isFile(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function readPackageName(projectRoot) {
  try {
    const packageJson = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
    return typeof packageJson.name === 'string' ? packageJson.name : undefined;
  } catch {
    return undefined;
  }
}

async function isSandboxProject(projectRoot) {
  return (await readPackageName(projectRoot)) === SANDBOX_PACKAGE_NAME;
}

export async function resolveDevAppRoot(startDir) {
  if (await isFile(path.join(startDir, 'package.json'))) return startDir;
  throw new Error('No package.json found. Run `meridiane dev` from your Angular app root.');
}

export async function resolveSandboxAppRoot(startDir) {
  if (await isSandboxProject(startDir)) return startDir;

  const playgroundRoot = path.join(startDir, 'playground', 'angular-app');
  if (await isSandboxProject(playgroundRoot)) return playgroundRoot;

  throw new Error(
    'Missing <packageName>. Run from the playground app (`playground/angular-app`) or provide a package name.'
  );
}

export async function resolveSpecSource({useSandboxDefaults, appRoot, specArg}) {
  if (!useSandboxDefaults || specArg) return specArg;

  const localSpec = path.resolve(appRoot, '..', 'api-platform', 'var', 'openapi.json');
  return (await isFile(localSpec)) ? localSpec : 'http://localhost:8000/api/docs.json';
}
