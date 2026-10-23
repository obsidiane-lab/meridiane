import {HttpCallOptions, HttpRequestConfig} from '../../ports/resource-repository.port';
import {toHttpParams} from './query-builder';

export function resolveHttpCallOptions(options: HttpCallOptions | undefined, withCredentialsDefault: boolean) {
  return {
    headers: options?.headers,
    withCredentials: options?.withCredentials ?? withCredentialsDefault,
  };
}

export function buildHttpRequestOptions(request: HttpRequestConfig, withCredentialsDefault: boolean) {
  return {
    headers: request.headers,
    params: request.query ? toHttpParams(request.query) : undefined,
    body: request.body,
    // The caller types the response with `R`; `HttpClient.request` only infers it for `json`.
    responseType: (request.responseType ?? 'json') as 'json',
    withCredentials: request.withCredentials ?? withCredentialsDefault,
    observe: 'body' as const,
  };
}
