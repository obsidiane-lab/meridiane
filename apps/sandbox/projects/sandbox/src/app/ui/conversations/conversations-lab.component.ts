import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from "@angular/router";
import {BridgeFacade, ResourceFacade, FacadeFactory} from '@obsidiane/bridge-sandbox';
import {Message} from '../../entities/message';
import {Conversation} from '../../entities/conversation';
import {Iri, upsertInSignal} from '@obsidiane/bridge-sandbox';
import {JsonViewerComponent} from '../shared/json-viewer.component';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Subject, takeUntil} from 'rxjs';
import {BACKEND_BASE_URL} from '../../core/backend';

interface LogEntry {
  t: number;
  kind: 'init' | 'select' | 'update' | 'patch' | 'put' | 'manual-get';
  iri?: Iri | undefined;
  snapshot?: unknown;
}

type MeResponse = {
  user: {
    id: number | null;
    userIdentifier: string;
    roles: string[];
  } | null;
};

@Component({
  selector: 'app-conversations-lab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  templateUrl: './conversations-lab.component.html',
  styleUrls: ['./conversations-lab.component.css'],
})
export class ConversationsLabComponent implements AfterViewInit {
  readonly facade: ResourceFacade<Conversation>;
  private readonly messagesFacade: ResourceFacade<Message>;
  readonly selectedMessages: WritableSignal<readonly Message[]> = signal<readonly Message[]>([]);
  readonly messagesLoading = signal(false);
  readonly sending = signal(false);

  // Signals façade
  readonly conversations: WritableSignal<readonly Conversation[]> = signal<readonly Conversation[]>([])
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly status

  readonly meId = signal<number | null>(null);
  readonly meIdentifier = signal<string | null>(null);

  // Sélection & formulaire
  readonly selectedId = signal<Iri | undefined>(undefined);
  private readonly fb = inject(FormBuilder);
  readonly createForm = this.fb.nonNullable.group({
    title: ['New conversation', [Validators.required]],
    externalId: [''],
  });

  readonly editForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    externalId: [''],
  });

  readonly sendMessageForm = this.fb.nonNullable.group({
    text: ['', [Validators.required]],
  });

  // Logs
  private readonly _logs = signal<LogEntry[]>([]);
  readonly logs = this._logs.asReadonly();

  // Conversation sélectionnée
  readonly selected = computed<Conversation | null>(() => {
    const iri = this.selectedId();
    if (!iri) return null;
    return this.conversations().find(c => c['@id'] === iri) ?? null;
  });

  readonly searchForm = this.fb.nonNullable.group({
    q: [''],
  });

  readonly filtered = computed(() => {
    const q = this.searchForm.controls.q.value.trim().toLowerCase();
    const list = this.conversations();
    if (!q) return list;
    return list.filter((c) => {
      const id = String(c.id ?? '');
      const iri = String(c['@id'] ?? '');
      const title = String(c.title ?? '');
      const ext = String(c.externalId ?? '');
      return [id, iri, title, ext].some((x) => x.toLowerCase().includes(q));
    });
  });

  private readonly stopSelectedSse$ = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('messagesViewport') private messagesViewport?: ElementRef<HTMLElement>;
  @ViewChild('composer') private composer?: ElementRef<HTMLTextAreaElement>;

  constructor(
    private router: Router,
    protected facadeFactory: FacadeFactory,
    private readonly bridge: BridgeFacade,
  ) {

    this.facade = facadeFactory.create<Conversation>({url: `/api/conversations`})
    this.messagesFacade = facadeFactory.create<Message>({url: `/api/messages`})

    this.status = this.facade.connectionStatus;

    this.bridge.get$<MeResponse>('/api/auth/me').subscribe({
      next: (res) => {
        this.meId.set(res?.user?.id ?? null);
        this.meIdentifier.set(res?.user?.userIdentifier ?? null);
      },
      error: () => {
        this.meId.set(null);
        this.meIdentifier.set(null);
      },
    });

    this.load();
  }

  ngAfterViewInit(): void {
    this.scrollMessagesToBottom();
  }

  routing() {
    const iri = this.selectedId();
    const id = this.selected()?.id;
    if (id) {
      this.router.navigate([`/conversations/${id}/messages`]);
      return;
    }
    if (iri) {
      const m = String(iri).match(/\/api\/conversations\/(\d+)/);
      if (m?.[1]) {
        this.router.navigate([`/conversations/${m[1]}/messages`]);
      }
    }
  }

  // Actions toolbar
  load() {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getCollection$({page: 1, itemsPerPage: 20})
      .subscribe(list => {
        this.conversations.set(list.member);
        this.loading.set(false);
      }, (err) => {
        this.error.set(err?.message || 'Failed to load conversations');
        this.loading.set(false);
      });
  }

  watchAll() {
    this.facade.watch$(this.conversations().map(conversation => conversation['@id'])).subscribe(result => {
        upsertInSignal(this.conversations, result)
      }
    );
  }

  unwatchAll() {
    this.facade.unwatch(this.conversations().map(conversation => conversation['@id']));
  }

  select(c: Conversation) {
    this.selectedId.set(c['@id']);
    this.editForm.setValue({
      title: c.title ?? '',
      externalId: c.externalId ?? '',
    });
    this.pushLog({t: Date.now(), kind: 'select', iri: c['@id'], snapshot: c});

    this.stopSelectedSse$.next();
    this.loadMessagesForConversation(c);

    // Listen to Message events published on Conversation topic
    const topics = this.topicsForConversationIri(c["@id"]!);
    this.facade
      .watchSubResource$<Message>(topics, 'conversation')
      .pipe(takeUntilDestroyed(this.destroyRef), takeUntil(this.stopSelectedSse$))
      .subscribe((message) => {
        this.upsertChatMessage(message as any);
        this.scrollMessagesToBottom();
        const iri = c['@id'];
        if (iri) {
          this.facade.get$(iri).subscribe((fresh) => upsertInSignal(this.conversations, fresh));
        }
      });

    queueMicrotask(() => this.composer?.nativeElement?.focus());
  }

  watchOne() {
    const iri = this.selectedId();
    if (iri) {
      this.facade.watch$(iri);
    }
  }

  unwatchOne() {
    const id = this.selectedId();
    if (id) this.facade.unwatch(id);
  }

  manualGet() {
    const iri = this.selectedId();
    if (!iri) return;
    this.facade.get$(iri).subscribe(res => {
      this.pushLog({t: Date.now(), kind: 'manual-get', iri, snapshot: res});
    });
  }

  patch() {
    const iri = this.selectedId();
    if (!iri) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const {title, externalId} = this.editForm.getRawValue();
    const payload: Partial<Conversation> = {title: title.trim()};
    const ext = externalId.trim();
    payload.externalId = ext === '' ? null : ext;

    this.facade.patch$(iri, payload).subscribe(res => {
      this.pushLog({t: Date.now(), kind: 'patch', iri, snapshot: res});
    });
  }

  sendMessage(): void {
    const conv = this.selected();
    if (!conv?.['@id']) return;
    if (this.sendMessageForm.invalid) {
      this.sendMessageForm.markAllAsTouched();
      return;
    }

    const text = this.sendMessageForm.controls.text.value.trim();
    if (!text) return;

    this.sending.set(true);
    this.bridge
      .post$<Message, {conversation: string; originalText: string}>('/api/messages', {
        conversation: conv['@id'],
        originalText: text,
      })
      .subscribe({
        next: (res) => {
          this.upsertChatMessage(res);
          this.sendMessageForm.reset({text: ''});
          this.scrollMessagesToBottom();
        },
        error: (err) => {
          this.error.set(err?.message || 'Failed to send message');
          this.sending.set(false);
        },
        complete: () => this.sending.set(false),
      });
  }

  onComposerEnter(ev: Event): void {
    const keyboardEvent = ev as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    keyboardEvent.preventDefault();
    this.sendMessage();
  }

  create() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const {title, externalId} = this.createForm.getRawValue();
    const payload: Partial<Conversation> = {title: title.trim()};
    const ext = externalId.trim();
    if (ext !== '') payload.externalId = ext;

    this.facade.post$(payload).subscribe(res => {
      upsertInSignal(this.conversations, res);
      this.pushLog({t: Date.now(), kind: 'update', iri: res['@id'], snapshot: res});
      this.loading.set(false);
      this.createForm.reset({title: 'New conversation', externalId: ''});
    }, (err) => {
      this.error.set(err?.message || 'Failed to create conversation');
      this.loading.set(false);
    });
  }

  removeSelected() {
    const iri = this.selectedId();
    if (!iri) return;
    this.facade.delete$(iri).subscribe(() => {
      this.conversations.update(list => list.filter(c => c['@id'] !== iri));
      this.selectedId.set(undefined);
      this.pushLog({t: Date.now(), kind: 'update', iri, snapshot: {deleted: true}});
    });
  }

  private loadMessagesForConversation(c: Conversation): void {
    const id = c.id;
    const iri = c['@id'];
    const convPath = id ? `/api/conversations/${id}/messages` : (iri ? `${iri}/messages` : null);
    if (!convPath) return;

    this.messagesLoading.set(true);
    this.messagesFacade
      .request$({method: 'GET', url: convPath, query: {page: 1, itemsPerPage: 50}})
      .subscribe({
        next: (col: any) => {
          const items = (col?.member ?? []) as Message[];
          this.selectedMessages.set(this.sortMessages(items));
          this.messagesLoading.set(false);
          this.scrollMessagesToBottom();
        },
        error: () => this.messagesLoading.set(false),
      });
  }

  isMine(m: Message): boolean {
    const myId = this.meId();
    if (!myId) return false;
    const authorId = this.extractNumericId(m.author);
    return authorId === myId;
  }

  displayAuthor(m: Message): string {
    if (this.isMine(m)) return this.meIdentifier() ?? 'You';
    const author = m.author ?? '';
    const id = this.extractNumericId(author);
    if (id) return `User #${id}`;
    return author || 'Unknown';
  }

  formatTime(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  }

  private upsertChatMessage(message: Message): void {
    this.selectedMessages.update((items) => {
      const id = message['@id'];
      if (!id) return this.sortMessages([...items, message]);

      const existingIndex = items.findIndex((m) => m['@id'] === id);
      if (existingIndex === -1) return this.sortMessages([...items, message]);

      const next = items.slice() as Message[];
      next[existingIndex] = message;
      return this.sortMessages(next);
    });
  }

  private sortMessages(items: Message[]): Message[] {
    return items.slice().sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
      if (!Number.isFinite(ta)) return -1;
      if (!Number.isFinite(tb)) return 1;
      return ta - tb;
    });
  }

  private extractNumericId(iri?: string): number | null {
    if (!iri) return null;
    const m = String(iri).match(/\/(\d+)(?:\/)?$/);
    if (!m?.[1]) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }

  private scrollMessagesToBottom(): void {
    const el = this.messagesViewport?.nativeElement;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }

  // utils logs
  private pushLog(entry: LogEntry) {
    const arr = this._logs();
    const next = [...arr, entry];
    if (next.length > 200) next.splice(0, next.length - 200);
    this._logs.set(next);
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
