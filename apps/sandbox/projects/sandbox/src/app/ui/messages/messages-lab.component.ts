import {Component, computed, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from "@angular/router";

import type {Message} from '@obsidiane/bridge-sandbox';
import {Iri, IriRequired} from "@obsidiane/bridge-sandbox";
import {JsonViewerComponent} from '../shared/json-viewer.component';
import {ConversationRepository} from '../../data/repositories/conversation.repository';
import {MessageRepository} from '../../data/repositories/message.repository';
import {Subscription} from 'rxjs';

interface LogEntry {
  t: number;
  kind: 'init' | 'select' | 'update' | 'patch' | 'put' | 'manual-get';
  iri?: Iri | undefined;
  snapshot?: unknown;
}

@Component({
  selector: 'app-messages-lab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  templateUrl: './messages-lab.component.html',
  styleUrls: ['./messages-lab.component.css'],
})
export class MessagesLabComponent {
  private readonly messagesRepo = inject(MessageRepository);
  private readonly conversationsRepo = inject(ConversationRepository);

  readonly conversationId: string;
  readonly conversationIri: IriRequired;
  readonly messages = computed(() => this.messagesRepo.messagesForConversation(this.conversationIri)());

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly status = this.conversationsRepo.status;

  // Sélection & formulaire
  readonly selectedId = signal<Iri | undefined>(undefined);
  private readonly fb = inject(FormBuilder);
  readonly createForm = this.fb.nonNullable.group({
    originalText: ['New message', [Validators.required]],
  });

  readonly editForm = this.fb.nonNullable.group({
    originalText: ['', [Validators.required]],
  });

  // Logs
  private readonly _logs = signal<LogEntry[]>([]);
  readonly logs = this._logs.asReadonly();

  // Message sélectionné
  readonly selected = computed<Message | null>(() => {
    const iri = this.selectedId();
    if (!iri) return null;
    return this.messages().find(m => m['@id'] === iri) ?? null;
  });

  readonly searchForm = this.fb.nonNullable.group({q: ['']});
  readonly filtered = computed(() => {
    const q = this.searchForm.controls.q.value.trim().toLowerCase();
    const list = this.messages();
    if (!q) return list;
    return list.filter((m) => {
      const id = String(m.id ?? '');
      const iri = String(m['@id'] ?? '');
      const txt = String(m.originalText ?? '');
      return [id, iri, txt].some((x) => x.toLowerCase().includes(q));
    });
  });

  private sseSub?: Subscription;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    const id = this.route.snapshot.paramMap.get('id') ?? '1';
    this.conversationId = id;
    this.conversationIri = `/api/conversations/${id}`;
    this.pushLog({t: Date.now(), kind: 'init'});
    this.load();
    this.enableSse();
  }

  routing() {
    this.disableSse();
    this.router.navigate(["/conversations"]);
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.messagesRepo
      .fetchByConversation$(this.conversationIri, {page: 1, itemsPerPage: 20})
      .subscribe({
        next: () => this.loading.set(false),
        error: (err) => {
          this.error.set(err?.message || 'Failed to load messages');
          this.loading.set(false);
        },
      });
  }

  watchAll() {
    this.enableSse();
  }

  unwatchAll() {
    this.disableSse();
  }

  select(m: Message) {
    this.selectedId.set(m["@id"]);
    this.editForm.setValue({originalText: m.originalText ?? ''});
    this.pushLog({t: Date.now(), kind: 'select', iri: m["@id"], snapshot: m});
  }

  watchOne() {
    this.enableSse();
  }

  unwatchOne() {
    this.disableSse();
  }

  manualGet() {
    const iri = this.selectedId();
    if (!iri) return;
    this.messagesRepo
      .fetch$(iri as IriRequired)
      .subscribe((res) => this.pushLog({t: Date.now(), kind: 'manual-get', iri, snapshot: res}));
  }

  patchOriginalText() {
    const iri = this.selectedId();
    if (!iri) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const {originalText} = this.editForm.getRawValue();
    this.messagesRepo.patch$(iri as IriRequired, {originalText: originalText.trim()}).subscribe({
      next: (res) => {
        this.pushLog({t: Date.now(), kind: 'patch', iri, snapshot: res});
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to patch message');
        this.loading.set(false);
      },
    });
  }

  create() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const {originalText} = this.createForm.getRawValue();

    this.messagesRepo.create$(this.conversationIri, originalText.trim()).subscribe({
      next: (res) => {
        const iri = res?.['@id'] as Iri | undefined;
        this.pushLog({t: Date.now(), kind: 'update', iri, snapshot: res});
        this.loading.set(false);
        this.createForm.reset({originalText: 'New message'});
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to create message');
        this.loading.set(false);
      },
    });
  }

  private enableSse(): void {
    if (this.sseSub) return;
    this.sseSub = this.conversationsRepo.watchMessages$(this.conversationIri).subscribe(() => undefined);
  }

  private disableSse(): void {
    this.conversationsRepo.unwatchMessages(this.conversationIri);
    this.sseSub?.unsubscribe();
    this.sseSub = undefined;
  }

  // utils logs
  private pushLog(entry: LogEntry) {
    const arr = this._logs();
    const next = [...arr, entry];
    if (next.length > 200) next.splice(0, next.length - 200);
    this._logs.set(next);
  }
}
