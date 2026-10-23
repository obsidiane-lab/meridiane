import {HttpInterceptorFn} from '@angular/common/http';
import {from, switchMap} from 'rxjs';
import {BridgeAuth} from '../bridge-options';

type TokenProvider = () => string | undefined | Promise<string | undefined>;

/** Builds the auth interceptor; `provideBridge` limits it to requests targeting the API. */
export function createAuthInterceptor(auth: BridgeAuth | undefined): HttpInterceptorFn | undefined {
  if (!auth) return undefined;
  if (typeof auth === 'function') return auth;

  const bearer = typeof auth === 'string' ? {token: auth} : auth;
  const getToken: TokenProvider = 'token' in bearer ? () => bearer.token : bearer.getToken;
  return createBearerAuthInterceptor(getToken);
}

function createBearerAuthInterceptor(getToken: TokenProvider): HttpInterceptorFn {
  return (request, next) => {
    if (request.headers.has('Authorization')) return next(request);

    return from(Promise.resolve(getToken())).pipe(
      switchMap((token) => {
        if (!token) return next(request);
        const headers = request.headers.set('Authorization', `Bearer ${token}`);
        return next(request.clone({headers}));
      })
    );
  };
}
