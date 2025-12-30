import {HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {BRIDGE_DEFAULTS, BRIDGE_LOGGER} from '../tokens';
import {retry, timeout, timer} from 'rxjs';

const DEFAULT_RETRY_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Applies default headers, timeout and retry policy configured via `provideBridge({defaults: ...})`.
 */
export const bridgeDefaultsInterceptor: HttpInterceptorFn = (req, next) => {
  const defaults = inject(BRIDGE_DEFAULTS, {optional: true}) ?? {};
  const logger = inject(BRIDGE_LOGGER, {optional: true});

  let nextReq = req;

  if (defaults.headers) {
    for (const [k, v] of Object.entries(defaults.headers)) {
      if (!nextReq.headers.has(k)) {
        nextReq = nextReq.clone({headers: nextReq.headers.set(k, v)});
      }
    }
  }

  let out$ = next(nextReq);

  const timeoutMs = typeof defaults.timeoutMs === 'number' ? defaults.timeoutMs : undefined;
  if (timeoutMs && timeoutMs > 0) {
    out$ = out$.pipe(timeout({first: timeoutMs}));
  }

  const retryCfg = defaults.retries;
  const retryCount = typeof retryCfg === 'number' ? retryCfg : retryCfg?.count;
  if (retryCount && retryCount > 0) {
    const methods = (typeof retryCfg === 'object' && retryCfg.methods) ? retryCfg.methods : DEFAULT_RETRY_METHODS;
    const normalizedMethod = req.method.toUpperCase();
    const methodAllowList = new Set(methods.map((m) => m.toUpperCase()));
    if (methodAllowList.has(normalizedMethod)) {
      const delayMs = typeof retryCfg === 'object' ? (retryCfg.delayMs ?? 250) : 250;
      out$ = out$.pipe(
        retry({
          count: retryCount,
          delay: (_err, retryIndex) => {
            logger?.debug?.('[Bridge] retry', {url: req.urlWithParams, method: req.method, retryIndex});
            return timer(delayMs);
          },
        })
      );
    }
  }

  return out$;
};
