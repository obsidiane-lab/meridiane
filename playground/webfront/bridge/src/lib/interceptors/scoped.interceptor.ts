import {HttpInterceptorFn} from '@angular/common/http';
import {isRequestWithinBaseUrl} from '../utils/request-url';

/** Limits a bridge interceptor to requests targeting the configured API. */
export function scopeInterceptor(baseUrl: string, interceptor: HttpInterceptorFn): HttpInterceptorFn {
  return (request, next) => isRequestWithinBaseUrl(request.url, baseUrl)
    ? interceptor(request, next)
    : next(request);
}
