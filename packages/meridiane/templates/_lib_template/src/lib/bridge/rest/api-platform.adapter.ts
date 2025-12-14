import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {toHttpParams} from './query-builder';
import {
  Collection,
  HttpCallOptions,
  HttpRequestConfig,
  Iri,
  IriRequired,
  Item,
  AnyQuery,
  ResourceRepository,
} from '../../ports/resource-repository.port';
import {CredentialsPolicy} from '../credentials.policy';
import {resolveUrl} from '../../utils/url';

export class ApiPlatformRestRepository<T extends Item> implements ResourceRepository<T> {
  private readonly credentialsPolicy: CredentialsPolicy;

  constructor(
    private readonly http: HttpClient,
    private readonly apiBase: string,
    private readonly resourcePath: Iri,
    init: RequestInit,
  ) {
    this.credentialsPolicy = new CredentialsPolicy(init);
  }

  getCollection$(query?: AnyQuery, opts?: HttpCallOptions): Observable<Collection<T>> {
    const params = toHttpParams(query);
    return this.http.get<Collection<T>>(this.resolveUrl(this.resourcePath), {
      params,
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  get$(iri: IriRequired, opts?: HttpCallOptions): Observable<T> {
    return this.http.get<T>(this.resolveUrl(iri), {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  post$(payload: Partial<T>, opts?: HttpCallOptions): Observable<T> {
    return this.http.post<T>(this.resolveUrl(this.resourcePath), payload, {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  patch$(iri: IriRequired, changes: Partial<T>, opts?: HttpCallOptions): Observable<T> {
    return this.http.patch<T>(this.resolveUrl(iri), changes, {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  put$(iri: IriRequired, payload: Partial<T>, opts?: HttpCallOptions): Observable<T> {
    return this.http.put<T>(this.resolveUrl(iri), payload, {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  delete$(iri: IriRequired, opts?: HttpCallOptions): Observable<void> {
    return this.http.delete<void>(this.resolveUrl(iri), {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  request$<R = unknown, B = unknown>(req: HttpRequestConfig<B>): Observable<R> {
    // Low-level escape hatch for non-standard endpoints (custom controllers, uploads, etc.).
    const {
      method,
      url,
      query,
      body,
      headers,
      responseType,
      withCredentials,
      options = {},
    } = req;

    const targetUrl = this.resolveUrl(url ?? this.resourcePath);
    const mergedOptions: Record<string, unknown> = {...options};

    mergedOptions['responseType'] = (responseType ?? (mergedOptions['responseType'] as any) ?? 'json') as any;

    mergedOptions['withCredentials'] =
      withCredentials ?? (mergedOptions['withCredentials'] as any) ?? this.credentialsPolicy.withCredentials();

    if (headers) mergedOptions['headers'] = headers;
    if (query) mergedOptions['params'] = toHttpParams(query);
    if (body !== undefined) mergedOptions['body'] = body;

    mergedOptions['observe'] = 'body';
    return this.http.request<R>(method, targetUrl, mergedOptions as {observe: 'body'});
  }

  private resolveUrl(path?: Iri): string {
    const effectivePath = path ?? this.resourcePath;
    if (!effectivePath) throw new Error('ApiPlatformRestRepository: missing url and resourcePath');
    return resolveUrl(this.apiBase, effectivePath);
  }
}
