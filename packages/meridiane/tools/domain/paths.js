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
