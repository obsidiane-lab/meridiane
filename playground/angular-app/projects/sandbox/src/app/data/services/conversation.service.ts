import {computed, inject, Injectable, Signal} from '@angular/core';
import {Conversation, IriRequired, Message} from '@obsidiane/bridge-sandbox';
import {forkJoin, Observable, of} from 'rxjs';
import {BACKEND_BASE_URL} from '../../core/backend';
import {MessageRepository} from '../repositories/message.repository';

@Injectable({providedIn: 'root'})
export class ConversationService {
  private readonly messages = inject(MessageRepository);

  messagesForConversation(conversationIri: IriRequired): Signal<readonly Message[]> {
    const absoluteIri = this.resolveBackendIri(conversationIri);
    const messages = this.messages.messages();

    return computed(() => messages()
      .filter((message) => message.conversation === conversationIri || message.conversation === absoluteIri)
      .sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return ta - tb;
      }));
  }

  loadMessages$(conversation: Conversation): Observable<readonly Message[]> {
    const missing = [...new Set(conversation.messages ?? [])]
      .filter((iri) => !this.messages.message(iri)());

    return missing.length ? forkJoin(missing.map((iri) => this.messages.fetch$(iri))) : of([]);
  }

  private resolveBackendIri(iri: string): string {
    try {
      return new URL(iri, BACKEND_BASE_URL).toString();
    } catch {
      return iri;
    }
  }
}
