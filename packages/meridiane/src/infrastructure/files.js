import fs from 'node:fs/promises';

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/** Removes then recreates a directory. */
export async function ensureCleanDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}
