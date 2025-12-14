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
