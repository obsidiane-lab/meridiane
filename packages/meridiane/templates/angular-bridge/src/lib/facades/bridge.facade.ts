import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {toHttpParams} from '../bridge/rest/query-builder';
import {buildHttpRequestOptions, resolveHttpCallOptions} from '../bridge/rest/http-request.options';
import {MercureHub} from '../bridge/sse/mercure-hub';
import {API_BASE_URL, BRIDGE_HTTP_WITH_CREDENTIALS} from '../tokens';
import {AnyQuery, Collection, HttpCallOptions, HttpRequestConfig, Iri, IriRequired, Item} from '../ports/resource-repository.port';
import {RealtimePort} from '../ports/realtime.port';
import {resolveUrl} from '../utils/url';
import {RealtimeDiagnostics, RealtimeStatus} from '../bridge.types';

/**
 * High-level facade for ad-hoc HTTP calls and the state of the Mercure connection.
 *
 * Prefer `FacadeFactory` + `ResourceFacade<T>` when you want a resource-oriented API.
 */
@Injectable({providedIn: 'root'})
export class BridgeFacade {
  constructor(
    private readonly http: HttpClient,
    @Inject(MercureHub) private readonly realtime: RealtimePort,
    @Inject(API_BASE_URL) private readonly apiBase: string,
    @Inject(BRIDGE_HTTP_WITH_CREDENTIALS) private readonly httpWithCredentialsDefault: boolean,
  ) {
  }

  get$<R = unknown>(url: IriRequired, options?: HttpCallOptions): Observable<R> {
    return this.http.get<R>(
      this.resolveUrl(url),
      resolveHttpCallOptions(options, this.httpWithCredentialsDefault)
    );
  }

  getCollection$<T extends Item = Item>(
    url: IriRequired,
    query?: AnyQuery,
    options?: HttpCallOptions
  ): Observable<Collection<T>> {
    return this.http.get<Collection<T>>(this.resolveUrl(url), {
      ...resolveHttpCallOptions(options, this.httpWithCredentialsDefault),
      params: toHttpParams(query),
    });
  }

  post$<R = unknown, B = unknown>(url: IriRequired, payload: B, options?: HttpCallOptions): Observable<R> {
    return this.http.post<R>(
      this.resolveUrl(url),
      payload,
      resolveHttpCallOptions(options, this.httpWithCredentialsDefault)
    );
  }

  patch$<R = unknown, B = unknown>(url: IriRequired, changes: B, options?: HttpCallOptions): Observable<R> {
    return this.http.patch<R>(
      this.resolveUrl(url),
      changes,
      resolveHttpCallOptions(options, this.httpWithCredentialsDefault)
    );
  }

  put$<R = unknown, B = unknown>(url: IriRequired, payload: B, options?: HttpCallOptions): Observable<R> {
    return this.http.put<R>(
      this.resolveUrl(url),
      payload,
      resolveHttpCallOptions(options, this.httpWithCredentialsDefault)
    );
  }

  delete$(url: IriRequired, options?: HttpCallOptions): Observable<void> {
    return this.http.delete<void>(
      this.resolveUrl(url),
      resolveHttpCallOptions(options, this.httpWithCredentialsDefault)
    );
  }

  request$<R = unknown, B = unknown>(request: HttpRequestConfig<B>): Observable<R> {
    const {method, url} = request;
    const targetUrl = this.resolveUrl(url);

    const mergedOptions = buildHttpRequestOptions(request, {withCredentialsDefault: this.httpWithCredentialsDefault});
    return this.http.request<R>(method, targetUrl, mergedOptions as {observe: 'body'});
  }

  /** State of the shared Mercure connection. */
  realtimeStatus$(): Observable<RealtimeStatus> {
    return this.realtime.status$();
  }

  /** Current Mercure connection, subscriptions and resume position. */
  realtimeDiagnostics$(): Observable<RealtimeDiagnostics> {
    return this.realtime.diagnostics$();
  }

  private resolveUrl(path?: Iri): string {
    if (!path) throw new Error('BridgeFacade: missing url');
    return resolveUrl(this.apiBase, path);
  }
}
