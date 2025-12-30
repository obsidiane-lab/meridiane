import {HttpEvent, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {finalize, Observable, shareReplay} from 'rxjs';

export type SingleFlightMode = 'off' | 'safe';

const DEFAULT_MODE: SingleFlightMode = 'safe';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createSingleFlightInterceptor(mode: SingleFlightMode = DEFAULT_MODE): HttpInterceptorFn {
  const inflight = new Map<string, Observable<HttpEvent<unknown>>>();

  return (req, next) => {
    if (mode === 'off') {
      return next(req);
    }

    const method = req.method.toUpperCase();
    if (!SAFE_METHODS.has(method)) {
      return next(req);
    }
    if (req.reportProgress === true) {
      return next(req);
    }

    const key = computeKey(req);
    const existing = inflight.get(key);
    if (existing) {
      return existing;
    }

    const shared$ = next(req).pipe(
      finalize(() => inflight.delete(key)),
      shareReplay({bufferSize: 1, refCount: true})
    );

    inflight.set(key, shared$);
    return shared$;
  };
}

function computeKey(req: HttpRequest<unknown>): string {
  const auth = req.headers.get('Authorization') ?? '';
  const accept = req.headers.get('Accept') ?? '';
  const contentType = req.headers.get('Content-Type') ?? '';
  const creds = req.withCredentials ? '1' : '0';
  return [
    req.method.toUpperCase(),
    req.urlWithParams,
    `rt=${req.responseType}`,
    `wc=${creds}`,
    `a=${auth}`,
    `acc=${accept}`,
    `ct=${contentType}`,
  ].join('::');
}
