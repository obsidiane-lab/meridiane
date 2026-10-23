import {inject, Injectable} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {toHttpParams} from '../bridge/rest/query-builder';
import {buildHttpRequestOptions, resolveHttpCallOptions} from '../bridge/rest/http-request.options';
import {MercureHub} from '../bridge/sse/mercure-hub';
import {API_BASE_URL, BRIDGE_HTTP_WITH_CREDENTIALS} from '../tokens';
import {AnyQuery, Collection, HttpCallOptions, HttpRequestConfig, Iri, Item} from '../ports/resource-repository.port';
import {MercureSubscription, RealtimePort, RealtimeSubscribeOptions} from '../ports/realtime.port';
import {resolveUrl, toAbsoluteUrl} from '../utils/url';
import {RealtimeDiagnostics, RealtimeStatus} from '../bridge.types';

/** Mercure selector of `BridgeFacade.watch$()`: an IRI / URL, or a URL Pattern. Relative values use `baseUrl`. */
export interface RealtimeSelector {
  match: string;
  /** Default: `exact`. */
  type?: MercureSubscription['type'];
}

/**
 * HTTP client of the bridge (every call resolves its IRI against `baseUrl`), and access to the Mercure connections.
 *
 * Prefer `FacadeFactory` + `ResourceFacade<T>` when you want a resource-oriented API.
 */
@Injectable({providedIn: 'root'})
export class BridgeFacade {
  private readonly http = inject(HttpClient);
  private readonly realtime: RealtimePort = inject(MercureHub);
  private readonly apiBase = inject(API_BASE_URL);
  private readonly httpWithCredentialsDefault = inject(BRIDGE_HTTP_WITH_CREDENTIALS);
  /** Mercure topics are absolute URLs: a relative `baseUrl` is resolved against the document base. */
  private readonly topicBaseUrl = toAbsoluteUrl(this.apiBase, inject(DOCUMENT).baseURI);

  get$<R = unknown>(url: Iri, options?: HttpCallOptions): Observable<R> {
    return this.http.get<R>(this.resolveUrl(url), resolveHttpCallOptions(options, this.httpWithCredentialsDefault));
  }

  getCollection$<T extends Item = Item>(url: Iri, query?: AnyQuery, options?: HttpCallOptions): Observable<Collection<T>> {
    return this.http.get<Collection<T>>(this.resolveUrl(url), {
      ...resolveHttpCallOptions(options, this.httpWithCredentialsDefault),
      params: toHttpParams(query),
    });
  }

  post$<R = unknown, B = unknown>(url: Iri, payload: B, options?: HttpCallOptions): Observable<R> {
    return this.http.post<R>(this.resolveUrl(url), payload, resolveHttpCallOptions(options, this.httpWithCredentialsDefault));
  }

  patch$<R = unknown, B = unknown>(url: Iri, changes: B, options?: HttpCallOptions): Observable<R> {
    return this.http.patch<R>(this.resolveUrl(url), changes, resolveHttpCallOptions(options, this.httpWithCredentialsDefault));
  }

  put$<R = unknown, B = unknown>(url: Iri, payload: B, options?: HttpCallOptions): Observable<R> {
    return this.http.put<R>(this.resolveUrl(url), payload, resolveHttpCallOptions(options, this.httpWithCredentialsDefault));
  }

  delete$(url: Iri, options?: HttpCallOptions): Observable<void> {
    return this.http.delete<void>(this.resolveUrl(url), resolveHttpCallOptions(options, this.httpWithCredentialsDefault));
  }

  /** Low-level escape hatch for non-standard endpoints (custom controllers, uploads, other formats...). */
  request$<R = unknown, B = unknown>(request: HttpRequestConfig<B>): Observable<R> {
    return this.http.request<R>(
      request.method,
      this.resolveUrl(request.url),
      buildHttpRequestOptions(request, this.httpWithCredentialsDefault)
    );
  }

  /**
   * Streams the JSON payloads of a custom Mercure subscription, without filtering them.
   *
   * The default connection is `dedicated`: every update received on it belongs to this subscription. On a
   * shared or named connection, the stream also carries the updates of the other subscriptions of that connection.
   */
  watch$<T = unknown>(selector: RealtimeSelector, options?: RealtimeSubscribeOptions): Observable<T> {
    const subscription: MercureSubscription = {
      match: resolveUrl(this.topicBaseUrl, selector.match),
      type: selector.type ?? 'exact',
    };
    return this.realtime
      .subscribe$(subscription, {connection: options?.connection ?? 'dedicated'})
      .pipe(map((update) => update.data as T));
  }

  /** Renews the Mercure authorization and reopens every connection, e.g. after login or logout. */
  reconnectRealtime(): void {
    this.realtime.reconnect();
  }

  /** State of the Mercure connections. */
  realtimeStatus$(): Observable<RealtimeStatus> {
    return this.realtime.status$();
  }

  /** Mercure connections, their subscriptions and resume positions. */
  realtimeDiagnostics$(): Observable<RealtimeDiagnostics> {
    return this.realtime.diagnostics$();
  }

  private resolveUrl(path?: Iri): string {
    if (!path) throw new Error('BridgeFacade: missing url');
    return resolveUrl(this.apiBase, path);
  }
}
