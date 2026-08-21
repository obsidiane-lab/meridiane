import {HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from '@angular/core';
import {retry, timeout, timer} from 'rxjs';
import {BridgeDefaults} from '../bridge.types';
import {BRIDGE_DEFAULTS, BRIDGE_LOGGER} from '../tokens';

const DEFAULT_RETRY_METHODS = ['GET', 'HEAD', 'OPTIONS'];

type RetryPolicy = {
  count: number;
  delayMs: number;
  methods: Set<string>;
};

/**
 * Applies default headers, timeout and retry policy configured via `provideBridge({defaults: ...})`.
 */
export const bridgeDefaultsInterceptor: HttpInterceptorFn = (req, next) => {
  const defaults = inject(BRIDGE_DEFAULTS, {optional: true}) ?? {};
  const logger = inject(BRIDGE_LOGGER, {optional: true});
  const request = applyDefaultHeaders(req, defaults.headers);

  let response$ = next(request);
  if (typeof defaults.timeoutMs === 'number' && defaults.timeoutMs > 0) {
    response$ = response$.pipe(timeout({first: defaults.timeoutMs}));
  }

  const retryPolicy = resolveRetryPolicy(defaults.retries);
  if (!retryPolicy || !retryPolicy.methods.has(req.method.toUpperCase())) {
    return response$;
  }

  return response$.pipe(
    retry({
      count: retryPolicy.count,
      delay: (_error, retryIndex) => {
        logger?.debug?.('[Bridge] retry', {url: req.urlWithParams, method: req.method, retryIndex});
        return timer(retryPolicy.delayMs);
      },
    })
  );
};

function applyDefaultHeaders(request: HttpRequest<unknown>, defaults?: Record<string, string>): HttpRequest<unknown> {
  if (!defaults) return request;

  let headers = request.headers;
  for (const [name, value] of Object.entries(defaults)) {
    if (!headers.has(name)) headers = headers.set(name, value);
  }

  return headers === request.headers ? request : request.clone({headers});
}

function resolveRetryPolicy(retries: BridgeDefaults['retries']): RetryPolicy | undefined {
  const count = typeof retries === 'number' ? retries : retries?.count;
  if (!count || count <= 0) return undefined;

  const methods = typeof retries === 'object' && retries.methods ? retries.methods : DEFAULT_RETRY_METHODS;
  return {
    count,
    delayMs: typeof retries === 'object' ? (retries.delayMs ?? 250) : 250,
    methods: new Set(methods.map((method) => method.toUpperCase())),
  };
}
