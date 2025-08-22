import {Signal, signal} from '@angular/core';
import {
  ResourceRepository,
  Query,
  CreateCommand,
  UpdateCommand,
  Id,
  Collection
} from '../ports/resource-repository.port';
import {RealtimePort, RealtimeStatus} from '../ports/realtime.port';
import {toSignal} from '@angular/core/rxjs-interop';
import {catchError, finalize, map, shareReplay, filter, throwError, tap, Observable} from 'rxjs';
import {Facade} from './facade.interface';

export class ResourceFacade<T extends { id?: Id }> implements Facade<T> {
  private readonly _items = signal<readonly T[]>([]);
  readonly items = this._items.asReadonly();

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  readonly connectionStatus: Signal<RealtimeStatus>;

  constructor(
    protected readonly repo: ResourceRepository<T>,
    protected readonly realtime: RealtimePort<T>,
    protected readonly resourcePath: string
  ) {
    this.resourcePath = resourcePath;
    this.connectionStatus = toSignal(
      this.realtime.status(),
      {initialValue: 'offline' as RealtimeStatus}
    );
  }

  dispose(): void {
    this.unwatchAll();
  }

  list(query?: Query): Observable<Collection<T>> {
    this._loading.set(true);
    return this.repo.list(query).pipe(
      tap(page => this._items.set(page.member)),
      catchError(err => {
        console.error('Erreur list()', err);
        return throwError(() => err);
      }),
      finalize(() => this._loading.set(false))
    )
  }

  get(id: Id) {
    return this.repo.get(id);
  }

  create(cmd: CreateCommand<T>) {
    return this.repo.create(cmd);
  }

  update(cmd: UpdateCommand<T>) {
    return this.repo.update(cmd);
  }

  delete(id: Id) {
    return this.repo.delete(id);
  }

  watchAll(): void {
    const iris = this.getAllIris();
    if (!iris.length) return;
    this.subscribeAndSync(iris);
  }

  watchOne(id: Id): void {
    this.subscribeAndSync([this.buildIri(id)]);
  }

  unwatchAll(): void {
    this.realtime.unsubscribe(this.getAllIris());
  }

  unwatchOne(id: Id): void {
    this.realtime.unsubscribe([this.buildIri(id)]);
  }

  protected subscribeAndSync(iris: string[]): void {
    this.realtime
      .subscribe(iris, payload => ({iri: payload['@id'] ?? '', data: payload as T | undefined}))
      .pipe(
        map(event => event.data),
        filter((data): data is T => data !== undefined),
        shareReplay({bufferSize: 1, refCount: true})
      )
      .subscribe(updated => this.applyUpdate(updated));
  }

  protected applyUpdate(updated: T): void {
    const current = this.items();
    const idx = current.findIndex(item => item.id === updated.id);
    const next = [...current];

    if (idx >= 0) {
      next[idx] = {...current[idx], ...updated};
    } else {
      next.push(updated);
    }
    this._items.set(next);
  }

  protected buildIri(id: Id): string {
    return `${this.resourcePath}/${id}`;
  }

  protected getAllIris(): string[] {
    return this.items().map(item => this.buildIri(item.id));
  }
}
