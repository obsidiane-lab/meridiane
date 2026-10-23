import { DatePipe, JsonPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucidePlus, lucideRefreshCw, lucideTrash2 } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import type { Conversation, Iri, Message } from 'bridge';
import { PageHeaderComponent } from 'src/app/shared/components/page-header/page-header.component';
import { iriOf } from 'src/app/core/utils/iri.util';
import { conversationSchema, messageIriSchema, messageSchema } from '../../forms/conversation.form';
import { ConversationService } from '../../services/conversation.service';

@Component({
  selector: 'app-conversations',
  templateUrl: './conversations.component.html',
  imports: [
    DatePipe,
    JsonPipe,
    FormField,
    NgIcon,
    TranslatePipe,
    HlmBadge,
    HlmButton,
    HlmInput,
    HlmSpinner,
    HlmTextarea,
    PageHeaderComponent,
    HlmAlertImports,
    HlmAlertDialogImports,
    HlmCardImports,
    HlmCollapsibleImports,
    HlmEmptyImports,
    HlmFieldImports,
  ],
  providers: [provideIcons({ lucidePencil, lucidePlus, lucideRefreshCw, lucideTrash2 })],
})
export class ConversationsComponent {
  private readonly service = inject(ConversationService);
  private readonly conversationDraft = signal({ title: '' });
  private readonly renameDraft = signal({ title: '' });
  private readonly messageDraft = signal({ content: '' });
  private readonly lookupDraft = signal({ iri: '' });

  protected readonly conversations = this.service.all;
  protected readonly diagnostics = this.service.diagnostics;
  protected readonly selectedIri = signal<Iri | undefined>(undefined);
  protected readonly inspectedIri = signal<Iri | undefined>(undefined);
  protected readonly editedMessageIri = signal<Iri | undefined>(undefined);
  protected readonly renaming = signal(false);
  protected readonly realtime = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal(false);
  protected readonly conversationForm = form(this.conversationDraft, conversationSchema);
  protected readonly renameForm = form(this.renameDraft, conversationSchema);
  protected readonly messageForm = form(this.messageDraft, messageSchema);
  protected readonly lookupForm = form(this.lookupDraft, messageIriSchema);
  protected readonly selected = computed(() => this.service.$conversation(this.selectedIri())());
  protected readonly inspected = computed(() => this.service.$message(this.inspectedIri())());
  protected readonly messages = computed(() => this.service.messageResources(this.selected().value));
  protected readonly iriOf = iriOf;

  constructor() {
    effect((onCleanup) => {
      if (!this.realtime()) return;
      const subscription = this.service.watch$().subscribe({ error: () => this.error.set(true) });
      onCleanup(() => subscription.unsubscribe());
    });
    effect((onCleanup) => {
      const iri = this.inspectedIri();
      if (!this.realtime() || !iri) return;
      const subscription = this.service.watchMessage$(iri).subscribe({ error: () => this.error.set(true) });
      onCleanup(() => subscription.unsubscribe());
    });
    effect(() => {
      if (this.busy()) return;
      const conversation = this.selected().value;
      untracked(() => this.service.loadRelatedMessages(conversation));
    });
    void this.refresh();
  }

  protected select(iri: Iri | undefined): void {
    this.selectedIri.set(iri);
    this.renaming.set(false);
    this.cancelEdit();
    if (iri) this.service.loadConversation(iri);
  }

  protected async refresh(): Promise<void> {
    await this.execute(() => this.service.refresh(this.selectedIri(), this.inspectedIri()));
  }

  protected async createConversation(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (this.conversationForm().invalid()) return;
    await this.execute(async () => {
      const conversation = await this.service.createConversation(this.conversationDraft().title.trim());
      this.conversationDraft.set({ title: '' });
      this.select(iriOf(conversation));
    });
  }

  protected startRename(conversation: Conversation): void {
    this.renameDraft.set({ title: conversation.title });
    this.renaming.set(true);
  }

  protected async rename(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const iri = this.selectedIri();
    if (!iri || this.renameForm().invalid()) return;
    await this.execute(async () => {
      await this.service.renameConversation(iri, this.renameDraft().title.trim());
      this.renaming.set(false);
    });
  }

  protected async deleteConversation(): Promise<void> {
    const iri = this.selectedIri();
    if (!iri) return;
    await this.execute(async () => {
      await this.service.deleteConversation(iri);
      this.select(undefined);
    });
  }

  protected editMessage(message: Message): void {
    this.editedMessageIri.set(iriOf(message));
    this.messageDraft.set({ content: message.content });
  }

  protected cancelEdit(): void {
    this.editedMessageIri.set(undefined);
    this.messageDraft.set({ content: '' });
  }

  protected async saveMessage(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const conversationIri = this.selectedIri();
    if (!conversationIri || this.messageForm().invalid()) return;
    await this.execute(async () => {
      const editedIri = this.editedMessageIri();
      const content = this.messageDraft().content.trim();
      if (editedIri) await this.service.updateMessage(editedIri, content);
      else await this.service.createMessage(conversationIri, content);
      this.cancelEdit();
    });
  }

  protected async deleteMessage(message: Message): Promise<void> {
    await this.execute(async () => {
      await this.service.deleteMessage(message);
      if (this.editedMessageIri() === iriOf(message)) this.cancelEdit();
    });
  }

  protected lookupMessage(event: SubmitEvent): void {
    event.preventDefault();
    if (this.lookupForm().invalid()) return;
    const iri = this.lookupDraft().iri;
    this.inspectedIri.set(iri);
    this.service.loadMessage(iri);
  }

  private async execute(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(false);
    try {
      await action();
    } catch (error) {
      console.warn('Playground: operation failed.', error);
      this.error.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
