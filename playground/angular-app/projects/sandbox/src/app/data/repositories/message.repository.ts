import {inject, Injectable, Signal} from '@angular/core';
import {tap} from 'rxjs/operators';
import {Observable} from 'rxjs';

import {AnyQuery, Collection, FacadeFactory, Iri, IriRequired, ResourceEvent, ResourceFacade} from '@obsidiane/bridge-sandbox';

import type {Message} from '@obsidiane/bridge-sandbox';
import {MessageStore} from '../stores/message.store';

@Injectable({providedIn: 'root'})
export class MessageRepository {
  private readonly store = inject(MessageStore);
  private readonly facadeFactory = inject(FacadeFactory);

  private readonly facade: ResourceFacade<Message> = this.facadeFactory.create<Message>({url: '/api/messages'});

  messages(): Signal<readonly Message[]> {
    return this.store.entities();
  }

  message(iri: Iri): Signal<Message | undefined> {
    return this.store.entity(iri);
  }

  fetch$(iri: IriRequired): Observable<Message> {
    return this.facade.get$(iri).pipe(tap((m) => this.store.upsert(m)));
  }

  fetchAll$(query?: AnyQuery): Observable<Collection<Message>> {
    return this.facade.getCollection$(query).pipe(tap((col) => this.store.upsertMany(col.member)));
  }

  create$(conversationIri: IriRequired, originalText: string): Observable<Message> {
    return this.facade
      .post$({conversation: conversationIri, originalText})
      .pipe(tap((m) => this.store.upsert(m)));
  }

  patch$(iri: IriRequired, changes: Partial<Message>): Observable<Message> {
    return this.facade.patch$(iri, changes).pipe(tap((m) => this.store.upsert(m)));
  }

  delete$(iri: IriRequired): Observable<void> {
    return this.facade.delete$(iri).pipe(tap(() => this.store.remove(iri)));
  }

  /** Applies the Mercure changes to the store while subscribed (one IRI or every message). */
  watch$(iri?: IriRequired): Observable<ResourceEvent<Message>> {
    return this.facade.watch$(iri).pipe(tap((event) => this.store.apply(event)));
  }
}
