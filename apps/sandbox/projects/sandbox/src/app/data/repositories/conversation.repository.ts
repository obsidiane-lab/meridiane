import {inject, Injectable, Signal} from '@angular/core';
import {tap} from 'rxjs/operators';
import {Observable} from 'rxjs';

import {AnyQuery, Collection, FacadeFactory, IriRequired, ResourceFacade} from '@obsidiane/bridge-sandbox';

import type {Conversation, Message} from '@obsidiane/bridge-sandbox';
import {BACKEND_BASE_URL} from '../../core/backend';
import {ConversationStore} from '../stores/conversation.store';
import {MessageStore} from '../stores/message.store';

@Injectable({providedIn: 'root'})
export class ConversationRepository {
  private readonly store = inject(ConversationStore);
  private readonly messageStore = inject(MessageStore);
  private readonly facadeFactory = inject(FacadeFactory);

  private readonly facade: ResourceFacade<Conversation> = this.facadeFactory.create<Conversation>({url: '/api/conversations'});

  readonly status: Signal<'connecting' | 'connected' | 'closed'> = this.facade.connectionStatus;

  conversations(): Signal<readonly Conversation[]> {
    return this.store.entities();
  }

  fetchAll$(query?: AnyQuery): Observable<Collection<Conversation>> {
    return this.facade.getCollection$(query).pipe(
      tap((col) => this.store.setAll(col.member)),
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

  watch$(iris: IriRequired | IriRequired[]): Observable<Conversation> {
    return this.facade.watch$(iris).pipe(tap((c) => this.store.upsert(c)));
  }

  unwatch(iris: IriRequired | IriRequired[]): void {
    this.facade.unwatch(iris);
  }

  watchMessages$(conversationIri: IriRequired): Observable<Message> {
    const topics = this.topicsForConversationIri(conversationIri);
    return this.facade
      .watchSubResource$<Message>(topics, 'conversation')
      .pipe(tap((m) => this.messageStore.upsert(m)));
  }

  unwatchMessages(conversationIri: IriRequired): void {
    this.facade.unwatch(this.topicsForConversationIri(conversationIri));
  }

  private topicsForConversationIri(iri: string): string[] {
    const abs = this.resolveBackendIri(iri);
    return abs === iri ? [iri] : [iri, abs];
  }

  private resolveBackendIri(iri: string): string {
    try {
      return new URL(iri, BACKEND_BASE_URL).toString();
    } catch {
      return iri;
    }
  }
}
