export function deriveLibName(packageName) {
  const raw = String(packageName || '').trim();
  if (!raw) throw new Error('Missing packageName');

  const base = raw.startsWith('@') ? (raw.split('/')[1] || '') : raw;
  const normalized = base
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!normalized) throw new Error(`Invalid packageName: ${packageName}`);
  return normalized;
}

