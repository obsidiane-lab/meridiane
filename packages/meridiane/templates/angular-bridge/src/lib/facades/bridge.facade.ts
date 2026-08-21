import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {filter, map, share} from 'rxjs/operators';
import {toHttpParams} from '../bridge/rest/query-builder';
import {buildHttpRequestOptions, resolveHttpCallOptions} from '../bridge/rest/http-request.options';
import {MercureRealtimeAdapter} from '../bridge/sse/mercure.adapter';
import {API_BASE_URL, BRIDGE_HTTP_WITH_CREDENTIALS} from '../tokens';
import {AnyQuery, Collection, HttpCallOptions, HttpRequestConfig, Iri, IriRequired, Item} from '../ports/resource-repository.port';
import {RealtimeDiagnosticsPort, SubscribeFilter} from '../ports/realtime.port';
import {resolveUrl} from '../utils/url';
import {toIriList} from '../utils/iri';
import {RealtimeDiagnostics, WatchConnectionOptions} from '../bridge.types';

export type TypedEvent<TType extends string = string, TPayload = unknown> = {
  resourceType: TType;
  payload: TPayload;
};

export type WatchTypesResult<R extends Record<string, any>> =
  { [K in keyof R]: TypedEvent<K & string, R[K]> }[keyof R];

export type WatchTypesConfig = {
  /** Field name used as discriminator. Default: `@type` (JSON-LD). */
  discriminator?: string;
};

export type WatchSubscriptionOptions = WatchConnectionOptions;

/**
 * High-level facade for ad-hoc HTTP calls and Mercure subscriptions.
 *
 * Prefer `FacadeFactory` + `ResourceFacade<T>` when you want a resource-oriented API.
 */
@Injectable({providedIn: 'root'})
export class BridgeFacade {
  constructor(
    private readonly http: HttpClient,
    @Inject(MercureRealtimeAdapter) private readonly realtime: RealtimeDiagnosticsPort,
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

  watch$<T = Item>(
    iri: Iri | Iri[],
    subscribeFilter?: SubscribeFilter,
    options?: WatchSubscriptionOptions
  ): Observable<T> {
    const iris = toIriList(iri);
    return this.realtime
      .subscribe$<T>(iris, subscribeFilter, options)
      .pipe(
        map((event) => event.data),
        filter((data): data is T => data !== undefined),
        share()
      );
  }

  /**
   * Watches a "multi-entity" topic and emits only payloads whose discriminator matches `resourceTypes`.
   *
   * Important:
   * - filtering is done on payload content (e.g. `@type`), not on network topic provenance.
   * - in shared mode (`connectionMode: 'auto'` without `newConnection`), events from another shared topic
   *   can be emitted if they carry an allowed discriminator.
   *
   * For strict single-topic isolation, use a dedicated connection:
   * `watchTypes$(..., ..., ..., { newConnection: true })`
   * (or `connectionMode: 'single'` globally).
   */
  watchTypes$<R extends Record<string, any>>(
    iri: Iri | Iri[],
    resourceTypes: (keyof R & string)[],
    config?: WatchTypesConfig,
    options?: WatchSubscriptionOptions
  ): Observable<WatchTypesResult<R>> {
    const iris = toIriList(iri);
    const discriminator = config?.discriminator ?? '@type';
    const allowedTypes = new Set(
      resourceTypes.filter((type): type is string => typeof type === 'string' && type.length > 0)
    );

    return this.realtime
      .subscribeAll$<unknown>(iris, options)
      .pipe(
        map((event): WatchTypesResult<R> | undefined => {
          const raw = event.data;

          const resolvedType = readDiscriminator(raw, discriminator);
          if (typeof resolvedType !== 'string') return undefined;
          if (!allowedTypes.has(resolvedType)) return undefined;

          const key = resolvedType as keyof R & string;
          return {resourceType: key, payload: raw as R[keyof R]} as WatchTypesResult<R>;
        }),
        filter((event): event is WatchTypesResult<R> => !!event),
        share()
      );
  }

  unwatch(iri: Iri | Iri[]): void {
    this.realtime.unsubscribe(toIriList(iri));
  }

  realtimeDiagnostics$(): Observable<RealtimeDiagnostics> {
    return this.realtime.diagnostics$();
  }

  private resolveUrl(path?: Iri): string {
    if (!path) throw new Error('BridgeFacade: missing url');
    return resolveUrl(this.apiBase, path);
  }
}

function readDiscriminator(payload: unknown, discriminator: string): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const value = (payload as Record<string, unknown>)[discriminator];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value.find((v) => typeof v === 'string');
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}
