import {HttpCallOptions, HttpRequestConfig} from '../../ports/resource-repository.port';
import {toHttpParams} from './query-builder';

export function resolveHttpCallOptions(options: HttpCallOptions | undefined, withCredentialsDefault: boolean) {
  return {
    headers: options?.headers,
    withCredentials: options?.withCredentials ?? withCredentialsDefault,
  };
}

export function buildHttpRequestOptions(
  req: HttpRequestConfig,
  {withCredentialsDefault}: {withCredentialsDefault: boolean}
): Record<string, unknown> {
  const {query, body, headers, responseType, withCredentials, options = {}} = req;
  const mergedOptions: Record<string, unknown> = {...options};

  if (headers) mergedOptions['headers'] = headers;
  if (query) mergedOptions['params'] = toHttpParams(query);
  if (body !== undefined) mergedOptions['body'] = body;

  const inheritedResponseType = mergedOptions['responseType'];
  const inheritedWithCredentials = mergedOptions['withCredentials'];

  mergedOptions['responseType'] = responseType ?? inheritedResponseType ?? 'json';
  mergedOptions['withCredentials'] = withCredentials ?? inheritedWithCredentials ?? withCredentialsDefault;
  mergedOptions['observe'] = 'body';

  return mergedOptions;
}
