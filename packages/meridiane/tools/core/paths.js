import fs from 'node:fs/promises';
import path from 'node:path';

export async function assertAngularWorkspace(cwd) {
  const angularJson = path.join(cwd, 'angular.json');
  try {
    const st = await fs.stat(angularJson);
    if (!st.isFile()) throw new Error();
  } catch {
    throw new Error('No angular.json found in current directory. Run Meridiane from the root of an Angular workspace.');
  }
}

export function normalizePreset(presetOption) {
  if (presetOption === undefined) return 'all';
  if (presetOption === true) return 'native';
  if (presetOption === 'native' || presetOption === 'all') return presetOption;
  throw new Error(`Invalid --preset value: ${presetOption} (expected: native|all)`);
}

export function splitListArgs(values) {
  const out = [];
  for (const v of Array.isArray(values) ? values : []) {
    for (const part of String(v).split(',')) {
      const s = part.trim();
      if (s) out.push(s);
    }
  }
  return out;
}

export async function findRootTsconfig(cwd) {
  const candidates = ['tsconfig.json', 'tsconfig.base.json'];
  for (const f of candidates) {
    const p = path.join(cwd, f);
    try {
      const st = await fs.stat(p);
      if (st.isFile()) return p;
    } catch {
      // ignore
    }
  }
  return undefined;
}

