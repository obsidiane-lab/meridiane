import {HttpRequestConfig} from '../../ports/resource-repository.port';
import {toHttpParams} from './query-builder';

export function buildHttpRequestOptions(
  req: HttpRequestConfig,
  {withCredentialsDefault}: {withCredentialsDefault: boolean}
): Record<string, unknown> {
  const {query, body, headers, responseType, withCredentials, options = {}} = req;
  const mergedOptions: Record<string, unknown> = {...options};

  if (headers) mergedOptions['headers'] = headers;
  if (query) mergedOptions['params'] = toHttpParams(query);
  if (body !== undefined) mergedOptions['body'] = body;

  mergedOptions['responseType'] = (responseType ?? (mergedOptions['responseType'] as any) ?? 'json') as any;
  mergedOptions['withCredentials'] =
    withCredentials ?? (mergedOptions['withCredentials'] as any) ?? withCredentialsDefault;
  mergedOptions['observe'] = 'body';

  return mergedOptions;
}
