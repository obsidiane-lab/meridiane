export function joinUrl(base: string, path: string): string {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function resolveUrl(base: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('//')) return path;
  return joinUrl(base, path);
}
