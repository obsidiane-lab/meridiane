import {inject, Injectable, Signal} from '@angular/core';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

import {AnyQuery, Collection, FacadeFactory, Iri, IriRequired, ResourceFacade} from '@obsidiane/bridge-sandbox';
import {User} from '../../entities/user';
import {UserStore} from '../stores/user.store';

@Injectable({providedIn: 'root'})
export class UserRepository {
  private readonly store = inject(UserStore);
  private readonly facadeFactory = inject(FacadeFactory);
  private readonly facade: ResourceFacade<User> = this.facadeFactory.create<User>({url: '/api/users'});

  users(): Signal<readonly User[]> {
    return this.store.entities();
  }

  user(iri: Iri): Signal<User | undefined> {
    return this.store.entity(iri);
  }

  fetchAll$(query?: AnyQuery): Observable<Collection<User>> {
    return this.facade.getCollection$(query).pipe(tap((col) => this.store.setAll(col.member)));
  }

  fetch$(iri: IriRequired): Observable<User> {
    return this.facade.get$(iri).pipe(tap((u) => this.store.upsert(u)));
  }

  create$(payload: Partial<User>): Observable<User> {
    return this.facade.post$(payload).pipe(tap((u) => this.store.upsert(u)));
  }

  patch$(iri: IriRequired, changes: Partial<User>): Observable<User> {
    return this.facade.patch$(iri, changes).pipe(tap((u) => this.store.upsert(u)));
  }

  put$(iri: IriRequired, payload: Partial<User>): Observable<User> {
    return this.facade.put$(iri, payload).pipe(tap((u) => this.store.upsert(u)));
  }

  watch$(iris: IriRequired | IriRequired[]): Observable<User> {
    return this.facade.watch$(iris).pipe(tap((u) => this.store.upsert(u)));
  }

  unwatch(iris: IriRequired | IriRequired[]): void {
    this.facade.unwatch(iris);
  }
}

