type UrlKind = 'absolute' | 'protocol-relative' | 'relative';

/** Returns whether a request belongs to the configured API origin and path. */
export function isRequestWithinBaseUrl(requestUrl: string, baseUrl: string): boolean {
  try {
    const kind = classifyUrl(baseUrl);
    if (kind !== classifyUrl(requestUrl)) return false;

    const protocol = kind === 'absolute' && baseUrl.toLowerCase().startsWith('http://') ? 'http:' : 'https:';
    const comparisonOrigin = `${protocol}//bridge.invalid`;
    const base = new URL(baseUrl, `${comparisonOrigin}/`);
    const request = new URL(requestUrl, `${comparisonOrigin}/`);

    if (base.origin !== request.origin) return false;

    const basePath = trimTrailingSlash(base.pathname);
    return basePath === '/' || request.pathname === basePath || request.pathname.startsWith(`${basePath}/`);
  } catch {
    return false;
  }
}

function classifyUrl(url: string): UrlKind {
  if (/^https?:\/\//i.test(url)) return 'absolute';
  if (url.startsWith('//')) return 'protocol-relative';
  return 'relative';
}

function trimTrailingSlash(pathname: string): string {
  return pathname === '/' ? pathname : pathname.replace(/\/+$/, '') || '/';
}
