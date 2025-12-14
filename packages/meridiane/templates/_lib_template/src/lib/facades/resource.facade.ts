import {Signal} from '@angular/core';
import {
  ResourceRepository,
  AnyQuery,
  HttpCallOptions,
  Iri,
  IriRequired,
  Collection,
  Item,
  HttpRequestConfig
} from '../ports/resource-repository.port';
import {RealtimePort, RealtimeStatus} from '../ports/realtime.port';
import {toSignal} from '@angular/core/rxjs-interop';
import {map, shareReplay, filter, Observable} from 'rxjs';
import {Facade} from './facade.interface';

export class ResourceFacade<T extends Item> implements Facade<T> {

  readonly connectionStatus: Signal<RealtimeStatus>;

  constructor(
    protected readonly repo: ResourceRepository<T>,
    protected readonly realtime: RealtimePort
  ) {
    this.connectionStatus = toSignal(
      this.realtime.status$(),
      {initialValue: 'closed'}
    );
  }

  getCollection$(query?: AnyQuery, opts?: HttpCallOptions): Observable<Collection<T>> {
    return this.repo.getCollection$(query, opts);
  }

  get$(iri: IriRequired, opts?: HttpCallOptions): Observable<T> {
    return this.repo.get$(iri, opts).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  patch$(iri: IriRequired, changes: Partial<T>, opts?: HttpCallOptions): Observable<T> {
    return this.repo.patch$(iri, changes, opts).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  post$(payload: Partial<T>, opts?: HttpCallOptions): Observable<T> {
    return this.repo.post$(payload, opts).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  put$(iri: IriRequired, payload: Partial<T>, opts?: HttpCallOptions): Observable<T> {
    return this.repo.put$(iri, payload, opts).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  delete$(iri: IriRequired, opts?: HttpCallOptions): Observable<void> {
    return this.repo.delete$(iri, opts).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  request$<R = unknown, B = unknown>(req: HttpRequestConfig<B>): Observable<R> {
    return this.repo.request$<R, B>(req).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  /**
   * Subscribes to real-time updates for one or many IRIs.
   * Undefined/empty values are ignored.
   */
  watch$(iri: Iri | Iri[]): Observable<T> {
    const iris = (Array.isArray(iri) ? iri : [iri]).filter((v): v is string => typeof v === 'string' && v.length > 0);
    return this.subscribeAndSync(iris);
  }


  unwatch(iri: Iri | Iri[]): void {
    const iris = (Array.isArray(iri) ? iri : [iri]).filter((v): v is string => typeof v === 'string' && v.length > 0);
    this.realtime.unsubscribe(iris);
  }

  /**
   * Subscribes to updates of a related sub-resource published on the parent topic.
   * Example: subscribe to Message events on a Conversation topic, filtering by `message.conversation`.
   */
  watchSubResource$<R>(
    iri: Iri | Iri[],
    field: string
  ): Observable<R> {
    const iris = (Array.isArray(iri) ? iri : [iri]).filter((v): v is string => typeof v === 'string' && v.length > 0);
    return this.realtime
      .subscribe$<R>(iris, {field: field})
      .pipe(
        map(e => e.data),
        filter((d): d is R => d !== undefined),
        shareReplay({bufferSize: 1, refCount: true})
      );
  }

  protected subscribeAndSync(iris: string[]): Observable<T> {
    return this.realtime
      .subscribe$<T>(iris)
      .pipe(
        map(event => event.data),
        filter((data): data is T => data !== undefined),
        shareReplay({bufferSize: 1, refCount: true})
      );
  }
}
