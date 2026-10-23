const ABSOLUTE_HTTP_URL = /^https?:\/\//i;

export function isAbsoluteHttpUrl(url: string): boolean {
  return ABSOLUTE_HTTP_URL.test(url);
}

export function trimTrailingSlash(path: string): string {
  return path.replace(/\/+$/, '');
}

const URL_ORIGIN = /^(?:https?:)?\/\/[^/?#]*/i;

/**
 * Resolves a path against the API base, with one rule for requests and Mercure topics:
 * - an absolute (`http(s)://`) or protocol-relative (`//host`) URL is returned as-is;
 * - a path starting with `/` is relative to the origin of the base, like the IRIs API Platform returns
 *   (`/api/books/1` against `https://example.com/backend` → `https://example.com/api/books/1`);
 * - any other path is relative to the base (`books/1` → `https://example.com/backend/books/1`).
 *
 * Plain string operations: URL Pattern syntax (`:id`, `{…}`, `*`) is kept unencoded.
 */
export function resolveUrl(base: string, path: string): string {
  if (isAbsoluteHttpUrl(path) || path.startsWith('//')) return path;
  if (path.startsWith('/')) return `${URL_ORIGIN.exec(base)?.[0] ?? ''}${path}`;
  return `${trimTrailingSlash(base)}/${path}`;
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
