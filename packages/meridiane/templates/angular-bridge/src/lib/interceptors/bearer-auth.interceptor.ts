import {HttpInterceptorFn} from '@angular/common/http';
import {from, switchMap} from 'rxjs';
import {BridgeAuth} from '../bridge-options';
import {isRequestWithinBaseUrl} from '../utils/request-url';

type TokenProvider = () => string | undefined | Promise<string | undefined>;

export function createAuthInterceptors(auth: BridgeAuth | undefined, baseUrl: string): HttpInterceptorFn[] {
  if (!auth) return [];
  if (typeof auth === 'function') return [auth];

  const bearer = typeof auth === 'string' ? {type: 'bearer' as const, token: auth} : auth;
  if (bearer.type !== 'bearer') return [];

  const getToken: TokenProvider = 'token' in bearer ? () => bearer.token : bearer.getToken;
  return [createBearerAuthInterceptor(baseUrl, getToken)];
}

function createBearerAuthInterceptor(baseUrl: string, getToken: TokenProvider): HttpInterceptorFn {
  return (request, next) => {
    if (!isRequestWithinBaseUrl(request.url, baseUrl) || request.headers.has('Authorization')) {
      return next(request);
    }

    return from(Promise.resolve(getToken())).pipe(
      switchMap((token) => {
        if (!token) return next(request);
        const headers = request.headers.set('Authorization', `Bearer ${token}`);
        return next(request.clone({headers}));
      })
    );
  };
}
