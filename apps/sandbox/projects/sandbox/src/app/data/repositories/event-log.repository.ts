import {inject, Injectable, Signal} from '@angular/core';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

import {AnyQuery, Collection, FacadeFactory, Iri, IriRequired, ResourceFacade} from '@obsidiane/bridge-sandbox';
import type {EventLog} from '@obsidiane/bridge-sandbox';
import {EventLogStore} from '../stores/event-log.store';

@Injectable({providedIn: 'root'})
export class EventLogRepository {
  private readonly store = inject(EventLogStore);
  private readonly facadeFactory = inject(FacadeFactory);
  private readonly facade: ResourceFacade<EventLog> = this.facadeFactory.create<EventLog>({url: '/api/event_logs'});

  events(): Signal<readonly EventLog[]> {
    return this.store.entities();
  }

  event(iri: Iri): Signal<EventLog | undefined> {
    return this.store.entity(iri);
  }

  fetchAll$(query?: AnyQuery): Observable<Collection<EventLog>> {
    return this.facade.getCollection$(query).pipe(tap((col) => this.store.setAll(col.member)));
  }

  fetch$(iri: IriRequired): Observable<EventLog> {
    return this.facade.get$(iri).pipe(tap((e) => this.store.upsert(e)));
  }

  create$(payload: Partial<EventLog>): Observable<EventLog> {
    return this.facade.post$(payload).pipe(tap((e) => this.store.upsert(e)));
  }

  patch$(iri: IriRequired, changes: Partial<EventLog>): Observable<EventLog> {
    return this.facade.patch$(iri, changes).pipe(tap((e) => this.store.upsert(e)));
  }

  put$(iri: IriRequired, payload: Partial<EventLog>): Observable<EventLog> {
    return this.facade.put$(iri, payload).pipe(tap((e) => this.store.upsert(e)));
  }

  delete$(iri: IriRequired): Observable<void> {
    return this.facade.delete$(iri).pipe(tap(() => this.store.remove(iri)));
  }

  watch$(iris: IriRequired | IriRequired[]): Observable<EventLog> {
    return this.facade.watch$(iris).pipe(tap((e) => this.store.upsert(e)));
  }

  unwatch(iris: IriRequired | IriRequired[]): void {
    this.facade.unwatch(iris);
  }
}
