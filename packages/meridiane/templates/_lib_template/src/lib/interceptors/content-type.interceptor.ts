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
    patch: 'application/merge-patch+json'
};

export const contentTypeInterceptor: HttpInterceptorFn = (req, next) => {
    const mediaTypes = DEFAULT_MEDIA_TYPES;
    let headers = req.headers;

    // Toujours définir Accept si absent
    if (!headers.has('Accept')) {
        headers = headers.set('Accept', mediaTypes.accept);
    }

    // Vérifie si la méthode peut avoir un body
    const isBodyMethod = ['POST', 'PUT', 'PATCH'].includes(req.method);
    // Ignore FormData (Content-Type sera défini par le navigateur)
    const isFormData = typeof FormData !== 'undefined' && req.body instanceof FormData;

    if (isBodyMethod && !isFormData && !headers.has('Content-Type')) {
        let contentType: string;

        switch (req.method) {
            case 'PATCH':
                contentType = mediaTypes.patch;
                break;
            case 'PUT':
                contentType = mediaTypes.put;
                break;
            default:
                contentType = mediaTypes.post;
        }

        headers = headers.set('Content-Type', contentType);
    }

    // Cloner la requête avec les nouveaux headers
    return next(req.clone({headers}));
};
