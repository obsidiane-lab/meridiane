import {Signal} from '@angular/core';
import {
  ResourceRepository,
  AnyQuery,
  HttpCallOptions,
  Iri,
  IriRequired,
  Collection,
  Item,
  HttpRequestConfig,
} from '../ports/resource-repository.port';
import {RealtimePort, RealtimeStatus} from '../ports/realtime.port';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter, map, Observable, share} from 'rxjs';
import {Facade} from './facade.interface';
import {WatchConnectionOptions} from '../bridge.types';
import {toIriList} from '../utils/iri';

export class ResourceFacade<T extends Item> implements Facade<T> {
  readonly connectionStatus: Signal<RealtimeStatus>;

  constructor(
    protected readonly repo: ResourceRepository<T>,
    protected readonly realtime: RealtimePort
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
   * Subscribes to real-time updates for one or many IRIs.
   * Undefined/empty values are ignored.
   */
  watch$(iri: Iri | Iri[], options?: WatchConnectionOptions): Observable<T> {
    return this.subscribeAndSync(toIriList(iri), options);
  }
  unwatch(iri: Iri | Iri[]): void {
    this.realtime.unsubscribe(toIriList(iri));
  }

  /**
   * Subscribes to updates of a related sub-resource published on the parent topic.
   * Example: subscribe to Message events on a Conversation topic, filtering by `message.conversation`.
   */
  watchSubResource$<R>(
    iri: Iri | Iri[],
    field: string,
    options?: WatchConnectionOptions
  ): Observable<R> {
    const iris = toIriList(iri);
    return this.realtime
      .subscribe$<R>(iris, {field}, options)
      .pipe(
        map((event) => event.data),
        filter((data): data is R => data !== undefined),
        share()
      );
  }

  protected subscribeAndSync(iris: string[], options?: WatchConnectionOptions): Observable<T> {
    return this.realtime
      .subscribe$<T>(iris, undefined, options)
      .pipe(
        map((event) => event.data),
        filter((data): data is T => data !== undefined),
        share()
      );
  }
}
