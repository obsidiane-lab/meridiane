import {Signal} from '@angular/core';
import {
  ResourceRepository,
  Query,
  CreateCommand,
  UpdateCommand,
  Collection, Iri, Item, HttpRequestConfig
} from '../ports/resource-repository.port';
import {RealtimePort, RealtimeStatus} from '../ports/realtime.port';
import {toSignal} from '@angular/core/rxjs-interop';
import {map, shareReplay, filter, Observable} from 'rxjs';
import {Facade, RestRequest} from './facade.interface';

export class ResourceFacade<T extends Item> implements Facade<T> {

  readonly connectionStatus: Signal<RealtimeStatus>;

  constructor(
    protected readonly repo: ResourceRepository<T>,
    protected readonly realtime: RealtimePort,
    protected readonly resourcePath: string
  ) {
    this.resourcePath = resourcePath;
    this.connectionStatus = toSignal(
      this.realtime.status$(),
      {initialValue: 'offline' as RealtimeStatus}
    );
  }

  list$(query?: Query): Observable<Collection<T>> {
    return this.repo.list$(query)
  }

  get$(iri: Iri): Observable<T> {
    return this.repo.get$(iri).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  create$(cmd: CreateCommand<T>) {
    return this.repo.create$(cmd).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  update$(cmd: UpdateCommand<T>) {
    return this.repo.update$(cmd).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  delete$(iri: Iri): Observable<void> {
    return this.repo.delete$(iri).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  request$<R = unknown, B = unknown>(req: HttpRequestConfig<B>): Observable<R> {
    return this.repo.request$<R, B>(req).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  post$<R = unknown, B = unknown>(req: RestRequest<B> = {}): Observable<R> {
    return this.request$<R, B>({...req, method: 'POST'});
  }

  put$<R = unknown, B = unknown>(req: RestRequest<B> = {}): Observable<R> {
    return this.request$<R, B>({...req, method: 'PUT'});
  }

  patch$<R = unknown, B = unknown>(req: RestRequest<B> = {}): Observable<R> {
    return this.request$<R, B>({...req, method: 'PATCH'});
  }

  watch$(iri: Iri | Iri[]): Observable<T> {
    if (Array.isArray(iri)) {
      return this.subscribeAndSync(iri);
    }
    return this.subscribeAndSync([iri]);
  }


  unwatch(iri: Iri | Iri[]): void {
    if (Array.isArray(iri)) {
      this.realtime.unsubscribe(iri);
      return;
    }
    this.realtime.unsubscribe([iri]);
  }

  watchSubResource$<R>(
    iri: Iri | Iri[],
    field: string
  ): Observable<R> {
    const iris = Array.isArray(iri) ? iri : [iri];
    return this.realtime
      .subscribe$<R>(iris, {field: field})
      .pipe(
        map(e => e.data),
        filter((d): d is R => d !== undefined),
        shareReplay({bufferSize: 1, refCount: true})
      );
  }

  protected subscribeAndSync(iris: Iri[]): Observable<T> {
    return this.realtime
      .subscribe$<T>(iris)
      .pipe(
        map(event => event.data),
        filter((data): data is T => data !== undefined),
        shareReplay({bufferSize: 1, refCount: true})
      )
  }
}
