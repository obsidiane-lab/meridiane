import {HttpEvent, HttpHeaders, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject, InjectionToken} from '@angular/core';
import {finalize, Observable, shareReplay} from 'rxjs';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** In-flight requests of one application instance (one per server-side render). */
const IN_FLIGHT_REQUESTS = new InjectionToken<Map<string, Observable<HttpEvent<unknown>>>>('IN_FLIGHT_REQUESTS', {
  providedIn: 'root',
  factory: () => new Map(),
});

export const singleFlightInterceptor: HttpInterceptorFn = (request, next) => {
  const method = request.method.toUpperCase();
  if (!SAFE_METHODS.has(method) || request.reportProgress) {
    return next(request);
  }

  const inFlight = inject(IN_FLIGHT_REQUESTS);
  const key = computeKey(request);
  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }

  const shared$ = next(request).pipe(
    finalize(() => inFlight.delete(key)),
    shareReplay({bufferSize: 1, refCount: true})
  );

  inFlight.set(key, shared$);
  return shared$;
};

function computeKey(request: HttpRequest<unknown>): string {
  return [
    request.method.toUpperCase(),
    request.urlWithParams,
    `rt=${request.responseType}`,
    `wc=${request.withCredentials ? '1' : '0'}`,
    `h=${serializeHeaders(request.headers)}`,
  ].join('::');
}

function serializeHeaders(headers: HttpHeaders): string {
  return headers.keys()
    .sort((left, right) => left.localeCompare(right))
    .map((name) => `${name.toLowerCase()}=${JSON.stringify(headers.getAll(name) ?? [])}`)
    .join('&');
}
