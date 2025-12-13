import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {filter, map, shareReplay} from 'rxjs/operators';
import {toHttpParams} from '../bridge/rest/query-builder';
import {CredentialsPolicy} from '../bridge/credentials.policy';
import {MercureRealtimeAdapter} from '../bridge/sse/mercure.adapter';
import {API_BASE_URL, MERCURE_CONFIG} from '../tokens';
import {AnyQuery, Collection, HttpCallOptions, HttpRequestConfig, Iri, IriRequired, Item} from '../ports/resource-repository.port';
import {SubscribeFilter} from '../ports/realtime.port';
import {resolveUrl} from '../utils/url';


@Injectable({providedIn: 'root'})
export class BridgeFacade {
  private readonly credentialsPolicy: CredentialsPolicy;

  constructor(
    private readonly http: HttpClient,
    private readonly realtime: MercureRealtimeAdapter,
    @Inject(API_BASE_URL) private readonly apiBase: string,
    @Inject(MERCURE_CONFIG) init: RequestInit
  ) {
    this.credentialsPolicy = new CredentialsPolicy(init);
  }

  // ──────────────── HTTP ────────────────

  get$<R = unknown>(url: IriRequired, opts?: HttpCallOptions): Observable<R> {
    return this.http.get<R>(this.resolveUrl(url), {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  getCollection$<T extends Item = Item>(
    url: IriRequired,
    query?: AnyQuery,
    opts?: HttpCallOptions
  ): Observable<Collection<T>> {
    const params = toHttpParams(query);
    return this.http.get<Collection<T>>(this.resolveUrl(url), {
      params,
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  post$<R = unknown, B = unknown>(url: IriRequired, payload: B, opts?: HttpCallOptions): Observable<R> {
    return this.http.post<R>(this.resolveUrl(url), payload, {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  patch$<R = unknown, B = unknown>(url: IriRequired, changes: B, opts?: HttpCallOptions): Observable<R> {
    return this.http.patch<R>(this.resolveUrl(url), changes, {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  put$<R = unknown, B = unknown>(url: IriRequired, payload: B, opts?: HttpCallOptions): Observable<R> {
    return this.http.put<R>(this.resolveUrl(url), payload, {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  delete$(url: IriRequired, opts?: HttpCallOptions): Observable<void> {
    return this.http.delete<void>(this.resolveUrl(url), {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.credentialsPolicy.withCredentials(),
    });
  }

  request$<R = unknown, B = unknown>(req: HttpRequestConfig<B>): Observable<R> {
    const {method, url, query, body, headers, responseType, withCredentials, options = {}} = req;
    const targetUrl = this.resolveUrl(url);
    const mergedOptions: any = {...options};

    if (headers) mergedOptions.headers = headers;
    if (query) mergedOptions.params = toHttpParams(query);
    if (body !== undefined) mergedOptions.body = body;

    mergedOptions.responseType = (responseType ?? mergedOptions.responseType ?? 'json') as any;
    mergedOptions.withCredentials = withCredentials ?? mergedOptions.withCredentials ?? this.credentialsPolicy.withCredentials();
    mergedOptions.observe = 'body';

    return this.http.request<R>(method, targetUrl, mergedOptions as {observe: 'body'});
  }

  // ──────────────── SSE / Mercure ────────────────

  watch$<T = Item>(iri: Iri | Iri[], subscribeFilter?: SubscribeFilter): Observable<T> {
    const iris = (Array.isArray(iri) ? iri : [iri]).filter((v): v is string => typeof v === 'string' && v.length > 0);
    return this.realtime
      .subscribe$<T>(iris, subscribeFilter)
      .pipe(
        map((event) => event.data),
        filter((data): data is T => data !== undefined),
        shareReplay({bufferSize: 1, refCount: true})
      );
  }

  unwatch(iri: Iri | Iri[]): void {
    const iris = (Array.isArray(iri) ? iri : [iri]).filter((v): v is string => typeof v === 'string' && v.length > 0);
    this.realtime.unsubscribe(iris);
  }

  private resolveUrl(path?: Iri): string {
    if (!path) throw new Error('BridgeFacade: missing url');
    return resolveUrl(this.apiBase, path);
  }
}
