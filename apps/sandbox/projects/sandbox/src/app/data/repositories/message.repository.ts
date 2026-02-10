import {computed, inject, Injectable, Signal} from '@angular/core';
import {tap} from 'rxjs/operators';
import {Observable} from 'rxjs';

import {AnyQuery, Collection, FacadeFactory, Iri, IriRequired, ResourceFacade} from '@obsidiane/bridge-sandbox';
import {BACKEND_BASE_URL} from '../../core/backend';

import type {MessageMessageRead as Message} from '@obsidiane/bridge-sandbox';
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

  messagesForConversation(conversationIri: IriRequired): Signal<readonly Message[]> {
    const rel = conversationIri;
    const abs = this.resolveBackendIri(conversationIri);

    return computed(() => {
      const list = this.store.entities()();
      return list
        .filter((m) => (m.conversation === rel || m.conversation === abs))
        .slice()
        .sort((a, b) => {
          const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
          const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
          return ta - tb;
        });
    });
  }

  fetch$(iri: IriRequired): Observable<Message> {
    return this.facade.get$(iri).pipe(tap((m) => this.store.upsert(m)));
  }

  fetchAll$(query?: AnyQuery): Observable<Collection<Message>> {
    return this.facade.getCollection$(query).pipe(tap((col) => this.store.upsertMany(col.member)));
  }

  fetchByConversation$(conversationIri: IriRequired, query?: AnyQuery): Observable<Collection<Message>> {
    return this.facade
      .request$<Collection<Message>>({
        method: 'GET',
        url: `${conversationIri}/messages`,
        query,
      })
      .pipe(tap((col) => this.store.upsertMany(col.member)));
  }

  create$(conversationIri: IriRequired, originalText: string): Observable<Message> {
    return this.facade
      // The generated read model expects an embedded Conversation object, but the API accepts an IRI on write.
      .post$({conversation: conversationIri, originalText} as any)
      .pipe(tap((m) => this.store.upsert(m)));
  }

  patch$(iri: IriRequired, changes: Partial<Message>): Observable<Message> {
    return this.facade.patch$(iri, changes).pipe(tap((m) => this.store.upsert(m)));
  }

  delete$(iri: IriRequired): Observable<void> {
    return this.facade.delete$(iri).pipe(tap(() => this.store.remove(iri)));
  }

  private resolveBackendIri(iri: string): string {
    try {
      return new URL(iri, BACKEND_BASE_URL).toString();
    } catch {
      return iri;
    }
  }
}
