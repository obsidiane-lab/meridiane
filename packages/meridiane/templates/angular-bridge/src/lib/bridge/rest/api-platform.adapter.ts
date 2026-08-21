import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {toHttpParams} from './query-builder';
import {buildHttpRequestOptions, resolveHttpCallOptions} from './http-request.options';
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
import {resolveUrl} from '../../utils/url';

export class ApiPlatformRestRepository<T extends Item> implements ResourceRepository<T> {
  constructor(
    private readonly http: HttpClient,
    private readonly apiBase: string,
    private readonly resourcePath: Iri,
    private readonly httpWithCredentialsDefault: boolean,
  ) {
  }

  getCollection$(query?: AnyQuery, options?: HttpCallOptions): Observable<Collection<T>> {
    return this.http.get<Collection<T>>(this.resolveUrl(this.resourcePath), {
      ...resolveHttpCallOptions(options, this.httpWithCredentialsDefault),
      params: toHttpParams(query),
    });
  }

  get$(iri: IriRequired, options?: HttpCallOptions): Observable<T> {
    return this.http.get<T>(this.resolveUrl(iri), resolveHttpCallOptions(options, this.httpWithCredentialsDefault));
  }

  post$(payload: Partial<T>, options?: HttpCallOptions): Observable<T> {
    return this.http.post<T>(
      this.resolveUrl(this.resourcePath),
      payload,
      resolveHttpCallOptions(options, this.httpWithCredentialsDefault)
    );
  }

  patch$(iri: IriRequired, changes: Partial<T>, options?: HttpCallOptions): Observable<T> {
    return this.http.patch<T>(
      this.resolveUrl(iri),
      changes,
      resolveHttpCallOptions(options, this.httpWithCredentialsDefault)
    );
  }

  put$(iri: IriRequired, payload: Partial<T>, options?: HttpCallOptions): Observable<T> {
    return this.http.put<T>(
      this.resolveUrl(iri),
      payload,
      resolveHttpCallOptions(options, this.httpWithCredentialsDefault)
    );
  }

  delete$(iri: IriRequired, options?: HttpCallOptions): Observable<void> {
    return this.http.delete<void>(
      this.resolveUrl(iri),
      resolveHttpCallOptions(options, this.httpWithCredentialsDefault)
    );
  }

  request$<R = unknown, B = unknown>(request: HttpRequestConfig<B>): Observable<R> {
    // Low-level escape hatch for non-standard endpoints (custom controllers, uploads, etc.).
    const {method, url} = request;

    const targetUrl = this.resolveUrl(url ?? this.resourcePath);
    const mergedOptions = buildHttpRequestOptions(request, {withCredentialsDefault: this.httpWithCredentialsDefault});
    return this.http.request<R>(method, targetUrl, mergedOptions as {observe: 'body'});
  }

  private resolveUrl(path?: Iri): string {
    const effectivePath = path ?? this.resourcePath;
    if (!effectivePath) throw new Error('ApiPlatformRestRepository: missing url and resourcePath');
    return resolveUrl(this.apiBase, effectivePath);
  }
}
