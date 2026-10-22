import {Signal} from '@angular/core';
import {
  ResourceRepository,
  AnyQuery,
  HttpCallOptions,
  IriRequired,
  Collection,
  Item,
  HttpRequestConfig,
} from '../ports/resource-repository.port';
import {RealtimePort} from '../ports/realtime.port';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter, map, Observable, share} from 'rxjs';
import {Facade} from './facade.interface';
import {RealtimeStatus} from '../bridge.types';
import {ResourceEvent, ResourceTopic} from '../bridge/sse/resource-topic';

export type {ResourceEvent} from '../bridge/sse/resource-topic';

export class ResourceFacade<T extends Item> implements Facade<T> {
  readonly connectionStatus: Signal<RealtimeStatus>;

  constructor(
    protected readonly repo: ResourceRepository<T>,
    protected readonly realtime: RealtimePort,
    protected readonly topic: ResourceTopic,
  ) {
    this.connectionStatus = toSignal(this.realtime.status$(), {initialValue: 'closed'});
  }

  getCollection$(query?: AnyQuery, options?: HttpCallOptions): Observable<Collection<T>> {
    return this.repo.getCollection$(query, options);
  }

  get$(iri: IriRequired, options?: HttpCallOptions): Observable<T> {
    return this.repo.get$(iri, options);
  }

  patch$(iri: IriRequired, changes: Partial<T>, options?: HttpCallOptions): Observable<T> {
    return this.repo.patch$(iri, changes, options);
  }

  post$(payload: Partial<T>, options?: HttpCallOptions): Observable<T> {
    return this.repo.post$(payload, options);
  }

  put$(iri: IriRequired, payload: Partial<T>, options?: HttpCallOptions): Observable<T> {
    return this.repo.put$(iri, payload, options);
  }

  delete$(iri: IriRequired, options?: HttpCallOptions): Observable<void> {
    return this.repo.delete$(iri, options);
  }

  request$<R = unknown, B = unknown>(request: HttpRequestConfig<B>): Observable<R> {
    return this.repo.request$<R, B>(request);
  }

  /**
   * Streams changes of one item when an IRI is supplied, or of the resource's items otherwise.
   *
   * Item subscriptions use `match`; resource subscriptions use `match_urlpattern`.
   * Unsubscribing releases this consumer; other consumers keep sharing the connection.
   */
  watch$(iri?: IriRequired): Observable<ResourceEvent<T>> {
    const topic = iri === undefined ? this.topic : this.topic.forIri(iri);
    return this.realtime
      .subscribe$({match: topic.match, type: topic.type})
      .pipe(
        map((update) => topic.toEvent<T>(update.data)),
        filter((event): event is ResourceEvent<T> => event !== undefined),
        share()
      );
  }
}
