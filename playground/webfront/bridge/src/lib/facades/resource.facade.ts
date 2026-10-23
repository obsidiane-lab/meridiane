import {Signal} from '@angular/core';
import {filter, map, Observable, share} from 'rxjs';
import {AnyQuery, Collection, HttpCallOptions, HttpRequestConfig, Iri, Item} from '../ports/resource-repository.port';
import {RealtimePort, RealtimeSubscribeOptions} from '../ports/realtime.port';
import {RealtimeStatus} from '../bridge.types';
import {ResourceDeletion, ResourceTopic} from '../bridge/sse/resource-topic';
import {BridgeFacade} from './bridge.facade';
import {Facade} from './facade.interface';

export {isResourceDeletion} from '../bridge/sse/resource-topic';
export type {ResourceDeletion} from '../bridge/sse/resource-topic';

/** API of one API Platform resource: its collection path for HTTP, its URL Pattern for Mercure. */
export class ResourceFacade<T extends Item> implements Facade<T> {
  readonly connectionStatus: Signal<RealtimeStatus>;

  constructor(
    protected readonly bridge: BridgeFacade,
    protected readonly url: Iri,
    protected readonly realtime: RealtimePort,
    protected readonly topic: ResourceTopic,
  ) {
    this.connectionStatus = realtime.status;
  }

  getCollection$(query?: AnyQuery, options?: HttpCallOptions): Observable<Collection<T>> {
    return this.bridge.getCollection$<T>(this.url, query, options);
  }

  get$(iri: Iri, options?: HttpCallOptions): Observable<T> {
    return this.bridge.get$<T>(iri, options);
  }

  post$(payload: Partial<T>, options?: HttpCallOptions): Observable<T> {
    return this.bridge.post$<T, Partial<T>>(this.url, payload, options);
  }

  patch$(iri: Iri, changes: Partial<T>, options?: HttpCallOptions): Observable<T> {
    return this.bridge.patch$<T, Partial<T>>(iri, changes, options);
  }

  put$(iri: Iri, payload: Partial<T>, options?: HttpCallOptions): Observable<T> {
    return this.bridge.put$<T, Partial<T>>(iri, payload, options);
  }

  delete$(iri: Iri, options?: HttpCallOptions): Observable<void> {
    return this.bridge.delete$(iri, options);
  }

  /** Low-level escape hatch; `url` defaults to the collection path of the resource. */
  request$<R = unknown, B = unknown>(request: HttpRequestConfig<B>): Observable<R> {
    return this.bridge.request$<R, B>({...request, url: request.url ?? this.url});
  }

  /**
   * Streams changes of one item when an IRI is supplied, or of the resource's items otherwise.
   * Payloads are forwarded unchanged, including API Platform deletion payloads.
   *
   * Item subscriptions use `match`; resource subscriptions use `match_urlpattern`. Updates are kept by `@id`,
   * so `connection` (default `shared`) only chooses the SSE connection carrying the subscription.
   * Unsubscribing releases this consumer; other consumers keep sharing the subscription.
   */
  watch$(iri?: Iri, options?: RealtimeSubscribeOptions): Observable<T | ResourceDeletion> {
    const topic = iri === undefined ? this.topic : this.topic.forIri(iri);
    return this.realtime
      .subscribe$({match: topic.match, type: topic.type}, options)
      .pipe(
        map((update) => topic.toResource<T>(update.data)),
        filter((resource): resource is T | ResourceDeletion => resource !== undefined),
        share()
      );
  }
}
