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
