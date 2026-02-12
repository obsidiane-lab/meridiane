import {inject, Injectable, Signal} from '@angular/core';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

import {AnyQuery, Collection, FacadeFactory, Iri, IriRequired, ResourceFacade} from '@obsidiane/bridge-sandbox';
import type {KeyValueConfigKvRead as KeyValueConfig} from '@obsidiane/bridge-sandbox';
import {KeyValueConfigStore} from '../stores/key-value-config.store';

@Injectable({providedIn: 'root'})
export class KeyValueConfigRepository {
  private readonly store = inject(KeyValueConfigStore);
  private readonly facadeFactory = inject(FacadeFactory);
  private readonly facade: ResourceFacade<KeyValueConfig> = this.facadeFactory.create<KeyValueConfig>({url: '/api/key_value_configs'});

  configs(): Signal<readonly KeyValueConfig[]> {
    return this.store.entities();
  }

  config(iri: Iri): Signal<KeyValueConfig | undefined> {
    return this.store.entity(iri);
  }

  fetchAll$(query?: AnyQuery): Observable<Collection<KeyValueConfig>> {
    return this.facade.getCollection$(query).pipe(tap((col) => this.store.setAll(col.member)));
  }

  fetch$(iri: IriRequired): Observable<KeyValueConfig> {
    return this.facade.get$(iri).pipe(tap((kv) => this.store.upsert(kv)));
  }

  create$(payload: Partial<KeyValueConfig>): Observable<KeyValueConfig> {
    return this.facade.post$(payload).pipe(tap((kv) => this.store.upsert(kv)));
  }

  patch$(iri: IriRequired, changes: Partial<KeyValueConfig>): Observable<KeyValueConfig> {
    return this.facade.patch$(iri, changes).pipe(tap((kv) => this.store.upsert(kv)));
  }

  put$(iri: IriRequired, payload: Partial<KeyValueConfig>): Observable<KeyValueConfig> {
    return this.facade.put$(iri, payload).pipe(tap((kv) => this.store.upsert(kv)));
  }

  delete$(iri: IriRequired): Observable<void> {
    return this.facade.delete$(iri).pipe(tap(() => this.store.remove(iri)));
  }

  watch$(iris: IriRequired | IriRequired[]): Observable<KeyValueConfig> {
    return this.facade.watch$(iris).pipe(tap((kv) => this.store.upsert(kv)));
  }

  unwatch(iris: IriRequired | IriRequired[]): void {
    this.facade.unwatch(iris);
  }
}
