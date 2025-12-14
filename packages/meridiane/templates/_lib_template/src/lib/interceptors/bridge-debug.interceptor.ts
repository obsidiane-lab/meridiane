import {HttpInterceptorFn, HttpResponse} from '@angular/common/http';
import {inject} from '@angular/core';
import {BRIDGE_LOGGER} from '../tokens';
import {catchError, finalize, tap, throwError} from 'rxjs';

/**
 * Lightweight request/response logging controlled by `provideBridge({debug: true})`.
 * Logs are delegated to the injected `BRIDGE_LOGGER`.
 */
export const bridgeDebugInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(BRIDGE_LOGGER, {optional: true});
  if (!logger) return next(req);

  const startedAt = Date.now();
  logger.debug('[Bridge] request', {method: req.method, url: req.urlWithParams});

  return next(req).pipe(
    tap((evt) => {
      if (evt instanceof HttpResponse) {
        logger.debug('[Bridge] response', {method: req.method, url: req.urlWithParams, status: evt.status});
      }
    }),
    catchError((err) => {
      logger.error('[Bridge] error', {method: req.method, url: req.urlWithParams, err});
      return throwError(() => err);
    }),
    finalize(() => {
      const durationMs = Date.now() - startedAt;
      logger.debug('[Bridge] done', {method: req.method, url: req.urlWithParams, durationMs});
    })
  );
};
