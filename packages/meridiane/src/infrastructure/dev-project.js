import fs from 'node:fs/promises';
import path from 'node:path';

async function isFile(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export async function resolveDevAppRoot(startDir) {
  if (await isFile(path.join(startDir, 'package.json'))) return startDir;
  throw new Error('No package.json found. Run `meridiane dev` from your Angular app root.');
}
