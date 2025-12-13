import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Charge un fichier `.env` (format KEY=VALUE) dans process.env, sans écraser les variables déjà définies.
 * @param {{cwd?: string, filename?: string}} [opts]
 * @returns {Promise<Record<string, string>>} variables chargées
 */
export async function loadDotEnv(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const filename = opts.filename ?? '.env';
  const envPath = await findUp(cwd, filename);
  if (!envPath) return {};

  const raw = await fs.readFile(envPath, 'utf8');

  const loaded = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const normalized = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed;
    const idx = normalized.indexOf('=');
    if (idx < 0) continue;
    const key = normalized.slice(0, idx).trim();
    let value = normalized.slice(idx + 1).trim();
    if (!key) continue;

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
      loaded[key] = value;
    }
  }

  return loaded;
}

async function findUp(startDir, fileName) {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, fileName);
    try {
      const st = await fs.stat(candidate);
      if (st.isFile()) return candidate;
    } catch {
      // ignore
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}
