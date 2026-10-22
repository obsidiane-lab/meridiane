import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, merge } from 'rxjs';
import { BridgeFacade, type Conversation, type Iri, type Message } from 'bridge';
import { iriOf } from 'src/app/core/utils/iri.util';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly conversations = inject(ConversationRepository);
  private readonly messages = inject(MessageRepository);
  private readonly bridge = inject(BridgeFacade);

  readonly all = this.conversations.entities;
  readonly diagnostics = toSignal(this.bridge.realtimeDiagnostics$());

  $conversation(iri: Iri | undefined) {
    return this.conversations.$entity(iri);
  }

  $message(iri: Iri | undefined) {
    return this.messages.$entity(iri);
  }

  messageResources(conversation: Conversation | null) {
    return (conversation?.messages ?? []).map((iri) => ({ iri, resource: this.messages.$entity(iri)() }));
  }

  loadConversation(iri: Iri): void {
    this.conversations.ensure(iri);
  }

  loadRelatedMessages(conversation: Conversation | null): void {
    for (const iri of conversation?.messages ?? []) this.messages.ensure(iri);
  }

  loadMessage(iri: Iri): void {
    this.messages.ensure(iri);
  }

  watch$() {
    return merge(this.conversations.watch$(), this.messages.watch$());
  }

  watchMessage$(iri: Iri) {
    return this.messages.watch$(iri);
  }

  async refresh(iri?: Iri, messageIri?: Iri): Promise<void> {
    const collection = await firstValueFrom(this.conversations.fetchAll$());
    const conversation = collection.member.find((entity) => iriOf(entity) === iri);
    const messageIris = new Set(conversation?.messages ?? []);
    if (messageIri) messageIris.add(messageIri);
    // An explicit refresh also reloads cached messages after a period without SSE.
    await Promise.all([...messageIris].map((iri) => firstValueFrom(this.messages.fetch$(iri))));
  }

  createConversation(title: string): Promise<Conversation> {
    return firstValueFrom(this.conversations.create$({ title }));
  }

  renameConversation(iri: Iri, title: string): Promise<Conversation> {
    return firstValueFrom(this.conversations.update$(iri, { title }));
  }

  async deleteConversation(iri: Iri): Promise<void> {
    await firstValueFrom(this.conversations.delete$(iri));
    this.messages.removeConversationMessages(iri);
  }

  async createMessage(conversation: Iri, content: string): Promise<Message> {
    const message = await firstValueFrom(this.messages.create$({ conversation, content }));
    await firstValueFrom(this.conversations.fetch$(conversation));
    return message;
  }

  updateMessage(iri: Iri, content: string): Promise<Message> {
    return firstValueFrom(this.messages.update$(iri, { content }));
  }

  async deleteMessage(message: Message): Promise<void> {
    const iri = iriOf(message);
    if (!iri) return;
    await firstValueFrom(this.messages.delete$(iri));
    if (message.conversation) await firstValueFrom(this.conversations.fetch$(message.conversation));
  }
}
