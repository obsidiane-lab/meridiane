import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {filter, map, share} from 'rxjs/operators';
import {toHttpParams} from '../bridge/rest/query-builder';
import {buildHttpRequestOptions} from '../bridge/rest/http-request.options';
import {MercureRealtimeAdapter} from '../bridge/sse/mercure.adapter';
import {API_BASE_URL, BRIDGE_WITH_CREDENTIALS} from '../tokens';
import {AnyQuery, Collection, HttpCallOptions, HttpRequestConfig, Iri, IriRequired, Item} from '../ports/resource-repository.port';
import {SubscribeFilter} from '../ports/realtime.port';
import {resolveUrl} from '../utils/url';

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

/**
 * High-level facade for ad-hoc HTTP calls and Mercure subscriptions.
 *
 * Prefer `FacadeFactory` + `ResourceFacade<T>` when you want a resource-oriented API.
 */
@Injectable({providedIn: 'root'})
export class BridgeFacade {
  constructor(
    private readonly http: HttpClient,
    private readonly realtime: MercureRealtimeAdapter,
    @Inject(API_BASE_URL) private readonly apiBase: string,
    @Inject(BRIDGE_WITH_CREDENTIALS) private readonly withCredentialsDefault: boolean,
  ) {
  }

  // ──────────────── HTTP ────────────────

  get$<R = unknown>(url: IriRequired, opts?: HttpCallOptions): Observable<R> {
    return this.http.get<R>(this.resolveUrl(url), {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.withCredentialsDefault,
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
      withCredentials: opts?.withCredentials ?? this.withCredentialsDefault,
    });
  }

  post$<R = unknown, B = unknown>(url: IriRequired, payload: B, opts?: HttpCallOptions): Observable<R> {
    return this.http.post<R>(this.resolveUrl(url), payload, {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.withCredentialsDefault,
    });
  }

  patch$<R = unknown, B = unknown>(url: IriRequired, changes: B, opts?: HttpCallOptions): Observable<R> {
    return this.http.patch<R>(this.resolveUrl(url), changes, {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.withCredentialsDefault,
    });
  }

  put$<R = unknown, B = unknown>(url: IriRequired, payload: B, opts?: HttpCallOptions): Observable<R> {
    return this.http.put<R>(this.resolveUrl(url), payload, {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.withCredentialsDefault,
    });
  }

  delete$(url: IriRequired, opts?: HttpCallOptions): Observable<void> {
    return this.http.delete<void>(this.resolveUrl(url), {
      headers: opts?.headers,
      withCredentials: opts?.withCredentials ?? this.withCredentialsDefault,
    });
  }

  request$<R = unknown, B = unknown>(req: HttpRequestConfig<B>): Observable<R> {
    const {method, url} = req;
    const targetUrl = this.resolveUrl(url);

    const mergedOptions = buildHttpRequestOptions(req, {withCredentialsDefault: this.withCredentialsDefault});
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
        share()
      );
  }

  watchTypes$<R extends Record<string, any>>(
    iri: Iri | Iri[],
    resourceTypes: (keyof R & string)[],
    cfg?: WatchTypesConfig
  ): Observable<WatchTypesResult<R>> {
    const iris = (Array.isArray(iri) ? iri : [iri]).filter((v): v is string => typeof v === 'string' && v.length > 0);
    const discriminator = cfg?.discriminator ?? '@type';
    const allowedTypes = new Set(resourceTypes.filter((v): v is string => typeof v === 'string' && v.length > 0));

    return this.realtime
      .subscribeAll$<unknown>(iris)
      .pipe(
        map((event): WatchTypesResult<R> | undefined => {
          const raw = event.data;

          const resolvedType = readDiscriminator(raw, discriminator);
          if (typeof resolvedType !== 'string') return undefined;
          if (!allowedTypes.has(resolvedType)) return undefined;

          const key = resolvedType as keyof R & string;
          return {resourceType: key, payload: raw as R[keyof R]} as WatchTypesResult<R>;
        }),
        filter((evt): evt is WatchTypesResult<R> => !!evt),
        share()
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

function readDiscriminator(raw: unknown, discriminator: string): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = (raw as any)?.[discriminator];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value.find((v) => typeof v === 'string');
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}
