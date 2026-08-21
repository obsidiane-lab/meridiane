import {HttpInterceptorFn} from '@angular/common/http';

export interface ApiMediaTypes {
  accept: string;
  post: string;
  put: string;
  patch: string;
}

export const DEFAULT_MEDIA_TYPES: ApiMediaTypes = {
  accept: 'application/ld+json',
  post: 'application/ld+json',
  put: 'application/ld+json',
  patch: 'application/merge-patch+json',
};

const CONTENT_TYPE_BY_METHOD: Record<string, string> = {
  POST: DEFAULT_MEDIA_TYPES.post,
  PUT: DEFAULT_MEDIA_TYPES.put,
  PATCH: DEFAULT_MEDIA_TYPES.patch,
};

export const contentTypeInterceptor: HttpInterceptorFn = (req, next) => {
  let headers = req.headers;

  if (!headers.has('Accept')) {
    headers = headers.set('Accept', DEFAULT_MEDIA_TYPES.accept);
  }

  const contentType = CONTENT_TYPE_BY_METHOD[req.method];
  const isFormData = typeof FormData !== 'undefined' && req.body instanceof FormData;
  if (contentType && !isFormData && !headers.has('Content-Type')) {
    headers = headers.set('Content-Type', contentType);
  }

  return next(headers === req.headers ? req : req.clone({headers}));
};
