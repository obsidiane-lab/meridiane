import {Signal, signal} from '@angular/core';
import {
  ResourceRepository,
  Query,
  CreateCommand,
  UpdateCommand,
  Collection, Iri, Item
} from '../ports/resource-repository.port';
import {RealtimePort, RealtimeStatus} from '../ports/realtime.port';
import {toSignal} from '@angular/core/rxjs-interop';
import {map, shareReplay, filter, tap, Observable} from 'rxjs';
import {Facade} from './facade.interface';

export class ResourceFacade<T extends Item> implements Facade<T> {
  private readonly _items = signal<readonly Item[]>([]);
  readonly items = this._items.asReadonly();

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


  dispose(): void {
    this.unwatchAll();
  }

  list$(query?: Query): Observable<Collection<T>> {
    return this.repo.list$(query).pipe(
      tap(page => {
        this._items.set(page.member)
      })
    )
  }

  get$(iri: Iri): Observable<T> {
    return this.repo.get$(iri).pipe(
      tap(entity => {
        if (entity) this.applyUpdate(entity);
      }),
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  create$(cmd: CreateCommand<T>) {
    return this.repo.create$(cmd).pipe(
      tap(entity => {
        if (entity) this._items.set([...this.items(), entity]);
      }),
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  update$(cmd: UpdateCommand<T>) {
    return this.repo.update$(cmd).pipe(
      tap(entity => {
        if (entity) this.applyUpdate(entity);
      }),
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  delete$(iri: Iri) {
    return this.repo.delete$(iri).pipe(
      tap(() => this._items.set(
        this.items().filter(i => i['@id'] !== iri))
      ),
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  watchAll(): void {
    const iris = this.getAllIris();
    if (!iris.length) return;
    this.subscribeAndSync(iris);
  }

  watchOne(iri: Iri): void {
    this.subscribeAndSync([iri]);
  }

  unwatchAll(): void {
    this.realtime.unsubscribe(this.getAllIris());
  }

  unwatchOne(iri: Iri): void {
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

  protected subscribeAndSync(iris: Iri[]): void {
    this.realtime
      .subscribe$<T>(iris)
      .pipe(
        map(event => event.data),
        filter((data): data is T => data !== undefined),
        shareReplay({bufferSize: 1, refCount: true})
      )
      .subscribe(updated => {
        this.applyUpdate(updated)
      });
  }

  protected applyUpdate(updated: T): void {
    const current = this.items();
    const idx = current.findIndex(item => item["@id"] === updated["@id"]);
    const next = [...current];

    if (idx >= 0) {
      next[idx] = {...current[idx], ...updated};
    } else {
      next.push(updated);
    }
    this._items.set(next);
  }

  protected getAllIris(): Iri[] {
    return this.items().map(item => item["@id"]);
  }
}
