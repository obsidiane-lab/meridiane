import {HttpInterceptorFn} from '@angular/common/http';

const ACCEPT = 'application/ld+json';

const CONTENT_TYPE_BY_METHOD: Record<string, string> = {
  POST: 'application/ld+json',
  PUT: 'application/ld+json',
  PATCH: 'application/merge-patch+json',
};

export const contentTypeInterceptor: HttpInterceptorFn = (req, next) => {
  let headers = req.headers;

  if (!headers.has('Accept')) {
    headers = headers.set('Accept', ACCEPT);
  }

  const contentType = CONTENT_TYPE_BY_METHOD[req.method];
  const isFormData = typeof FormData !== 'undefined' && req.body instanceof FormData;
  if (contentType && !isFormData && !headers.has('Content-Type')) {
    headers = headers.set('Content-Type', contentType);
  }

  return next(headers === req.headers ? req : req.clone({headers}));
};
