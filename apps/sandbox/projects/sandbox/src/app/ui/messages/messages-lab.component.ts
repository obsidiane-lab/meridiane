import {Component, computed, inject, signal, WritableSignal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from "@angular/router";

import {Message} from '../../entities/message';

import {BridgeFacade, FacadeFactory, Iri, ResourceFacade} from "@obsidiane/bridge-sandbox";
import {tap} from 'rxjs';
import {upsertInSignal} from "@obsidiane/bridge-sandbox";
import {JsonViewerComponent} from '../shared/json-viewer.component';
import {Conversation} from '../../entities/conversation';
import {BACKEND_BASE_URL} from '../../core/backend';

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

  readonly facade: ResourceFacade<Message>;
  readonly conversationFacade: ResourceFacade<Conversation>;
  // Signals façade
  readonly messages: WritableSignal<readonly Message[]> = signal<readonly Message[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly status

  // Sélection & formulaire
  readonly selectedId = signal<Iri | undefined>(undefined);
  private readonly fb = inject(FormBuilder);
  readonly createForm = this.fb.nonNullable.group({
    originalText: ['New message', [Validators.required]],
  });

  readonly editForm = this.fb.nonNullable.group({
    originalText: ['', [Validators.required]],
  });
  readonly conversationId: string;

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

  private sseSub?: { unsubscribe(): void };

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    protected facadeFactory: FacadeFactory,
    private readonly bridge: BridgeFacade,
  ) {
    const id = this.route.snapshot.paramMap.get('id') ?? '1';
    this.conversationId = id;
    this.facade = facadeFactory.create<Message>({url: `/api/conversations/${id}/messages`})
    this.conversationFacade = facadeFactory.create<Conversation>({url: `/api/conversations`})
    this.status = this.facade.connectionStatus;
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
    this.facade.getCollection$({page: 1, itemsPerPage: 20})
      .pipe(
        tap(list => {
          this.messages.set(list.member)
          this.loading.set(false);
        })
      )
      .subscribe({
        error: (err) => {
          this.error.set(err?.message || 'Failed to load messages');
          this.loading.set(false);
        }
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
    this.facade.get$(iri).subscribe(res => {
      this.pushLog({t: Date.now(), kind: 'manual-get', iri, snapshot: res});
    });
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
    this.facade.patch$(iri, {originalText: originalText.trim()}).subscribe(res => {
      this.pushLog({t: Date.now(), kind: 'patch', iri, snapshot: res});
      this.loading.set(false);
    }, (err) => {
      this.error.set(err?.message || 'Failed to patch message');
      this.loading.set(false);
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

    const conversation = `/api/conversations/${this.conversationId}`;
    this.bridge
      .post$('/api/messages', {conversation, originalText: originalText.trim()})
      .subscribe((res: any) => {
        const iri = res?.['@id'] as Iri | undefined;
        if (iri) upsertInSignal(this.messages, res);
        this.pushLog({t: Date.now(), kind: 'update', iri, snapshot: res});
        this.loading.set(false);
        this.createForm.reset({originalText: 'New message'});
      }, (err) => {
        this.error.set(err?.message || 'Failed to create message');
        this.loading.set(false);
      });
  }

  private enableSse(): void {
    if (this.sseSub) return;
    const conversationIri = `/api/conversations/${this.conversationId}`;
    const topics = this.topicsForConversationIri(conversationIri);
    this.sseSub = this.conversationFacade
      .watchSubResource$<Message>(topics, 'conversation')
      .subscribe((msg) => upsertInSignal(this.messages, msg));
  }

  private disableSse(): void {
    const conversationIri = `/api/conversations/${this.conversationId}`;
    const topics = this.topicsForConversationIri(conversationIri);
    this.conversationFacade.unwatch(topics);
    this.sseSub?.unsubscribe();
    this.sseSub = undefined;
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

  // utils logs
  private pushLog(entry: LogEntry) {
    const arr = this._logs();
    const next = [...arr, entry];
    if (next.length > 200) next.splice(0, next.length - 200);
    this._logs.set(next);
  }
}
