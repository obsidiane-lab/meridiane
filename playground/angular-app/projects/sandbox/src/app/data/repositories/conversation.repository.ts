import {inject, Injectable, Signal} from '@angular/core';
import {tap} from 'rxjs/operators';
import {Observable} from 'rxjs';

import {AnyQuery, Collection, FacadeFactory, IriRequired, ResourceEvent, ResourceFacade} from '@obsidiane/bridge-sandbox';

import type {Conversation} from '@obsidiane/bridge-sandbox';
import {ConversationStore} from '../stores/conversation.store';

@Injectable({providedIn: 'root'})
export class ConversationRepository {
  private readonly store = inject(ConversationStore);
  private readonly facadeFactory = inject(FacadeFactory);

  private readonly facade: ResourceFacade<Conversation> = this.facadeFactory.create<Conversation>({url: '/api/conversations'});

  readonly status: Signal<'connecting' | 'connected' | 'closed'> = this.facade.connectionStatus;

  conversations(): Signal<readonly Conversation[]> {
    return this.store.entities();
  }

  fetchAll$(query?: AnyQuery): Observable<Collection<Conversation>> {
    return this.facade.getCollection$(query).pipe(
      tap((col) => this.store.upsertMany(col.member)),
    );
  }

  fetch$(iri: IriRequired): Observable<Conversation> {
    return this.facade.get$(iri).pipe(tap((c) => this.store.upsert(c)));
  }

  create$(payload: Partial<Conversation>): Observable<Conversation> {
    return this.facade.post$(payload).pipe(tap((c) => this.store.upsert(c)));
  }

  patch$(iri: IriRequired, changes: Partial<Conversation>): Observable<Conversation> {
    return this.facade.patch$(iri, changes).pipe(tap((c) => this.store.upsert(c)));
  }

  delete$(iri: IriRequired): Observable<void> {
    return this.facade.delete$(iri).pipe(tap(() => this.store.remove(iri)));
  }

  /** Applies the Mercure changes to the store while subscribed (one IRI or every conversation). */
  watch$(iri?: IriRequired): Observable<ResourceEvent<Conversation>> {
    return this.facade.watch$(iri).pipe(tap((event) => this.store.apply(event)));
  }
}
