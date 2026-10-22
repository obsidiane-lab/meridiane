const ABSOLUTE_HTTP_URL = /^https?:\/\//i;

export function isAbsoluteHttpUrl(url: string): boolean {
  return ABSOLUTE_HTTP_URL.test(url);
}

export function trimTrailingSlash(path: string): string {
  return path.replace(/\/+$/, '');
}

/**
 * Resolves an API IRI (e.g. `/api/books/1`) to a full URL using the API base.
 * Absolute (`http(s)://`) and protocol-relative (`//host`) URLs are returned as-is.
 */
export function resolveUrl(base: string, path: string): string {
  if (isAbsoluteHttpUrl(path) || path.startsWith('//')) return path;
  return `${trimTrailingSlash(base)}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Resolves `url` against `base` (e.g. `/` against the document base → `https://app.example.com/`).
 * Returns `url` unchanged when no absolute URL can be built (e.g. no document base on the server).
 */
export function toAbsoluteUrl(url: string, base: string | undefined): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}
