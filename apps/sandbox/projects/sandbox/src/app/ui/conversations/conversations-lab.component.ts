import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  Signal,
  ViewChild,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from "@angular/router";
import {BridgeFacade, Iri, IriRequired, WatchConnectionOptions} from '@obsidiane/bridge-sandbox';
import type {ConversationConversationRead as Conversation, MessageMessageRead as Message} from '@obsidiane/bridge-sandbox';
import {JsonViewerComponent} from '../shared/json-viewer.component';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Subject, Subscription, takeUntil} from 'rxjs';
import {ConversationRepository} from '../../data/repositories/conversation.repository';
import {MessageRepository} from '../../data/repositories/message.repository';

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
export class ConversationsLabComponent implements AfterViewInit, OnDestroy {
  readonly messagesLoading = signal(false);
  readonly sending = signal(false);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly status: Signal<'connecting' | 'connected' | 'closed'>;
  readonly conversations: Signal<readonly Conversation[]>;

  readonly meId = signal<number | null>(null);
  readonly meIdentifier = signal<string | null>(null);

  // Sélection & formulaire
  readonly selectedId = signal<Iri | undefined>(undefined);
  private readonly fb = inject(FormBuilder);
  private readonly conversationsRepo = inject(ConversationRepository);
  private readonly messagesRepo = inject(MessageRepository);

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

  readonly realtimeWatchForm = this.fb.nonNullable.group({
    watchAllNewConnection: [false],
    watchOneNewConnection: [false],
    watchMessagesNewConnection: [false],
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

  private readonly selectedMessagesSource = signal<Signal<readonly Message[]> | null>(null);
  readonly selectedMessages = computed(() => this.selectedMessagesSource()?.() ?? []);

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
  private watchAllSub?: Subscription;
  private watchOneSub?: Subscription;

  @ViewChild('messagesViewport') private messagesViewport?: ElementRef<HTMLElement>;
  @ViewChild('composer') private composer?: ElementRef<HTMLTextAreaElement>;

  constructor(
    private router: Router,
    private readonly bridge: BridgeFacade,
  ) {
    this.status = this.conversationsRepo.status;
    this.conversations = this.conversationsRepo.conversations();

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

  ngOnDestroy(): void {
    this.stopSelectedSse$.next();
    this.stopSelectedSse$.complete();
    this.watchAllSub?.unsubscribe();
    this.watchAllSub = undefined;
    this.watchOneSub?.unsubscribe();
    this.watchOneSub = undefined;
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
    this.conversationsRepo
      .fetchAll$({page: 1, itemsPerPage: 20})
      .subscribe({
        next: () => this.loading.set(false),
        error: (err) => {
          this.error.set(err?.message || 'Failed to load conversations');
          this.loading.set(false);
        },
      });
  }

  watchAll() {
    this.watchAllSub?.unsubscribe();
    const iris = this.conversations()
      .map((c) => c['@id'])
      .filter((x): x is IriRequired => typeof x === 'string' && x.length > 0);
    const options = this.watchOptions(this.realtimeWatchForm.controls.watchAllNewConnection.value);

    this.watchAllSub = this.conversationsRepo.watch$(iris, options).subscribe(() => undefined);
  }

  unwatchAll() {
    this.watchAllSub?.unsubscribe();
    this.watchAllSub = undefined;
    const iris = this.conversations()
      .map((c) => c['@id'])
      .filter((x): x is IriRequired => typeof x === 'string' && x.length > 0);
    this.conversationsRepo.unwatch(iris);
  }

  select(c: Conversation) {
    this.selectedId.set(c['@id']);
    this.editForm.setValue({
      title: c.title ?? '',
      externalId: c.externalId ?? '',
    });
    this.pushLog({t: Date.now(), kind: 'select', iri: c['@id'], snapshot: c});

    this.stopSelectedSse$.next();
    const conversationIri = c['@id'];
    if (!conversationIri) return;

    this.selectedMessagesSource.set(this.messagesRepo.messagesForConversation(conversationIri));

    this.messagesLoading.set(true);
    this.messagesRepo
      .fetchByConversation$(conversationIri, {page: 1, itemsPerPage: 50})
      .subscribe({
        next: () => {
          this.messagesLoading.set(false);
          this.scrollMessagesToBottom();
        },
        error: () => this.messagesLoading.set(false),
      });

    // Listen to Message events published on Conversation topic
    const watchMessagesOptions = this.watchOptions(this.realtimeWatchForm.controls.watchMessagesNewConnection.value);
    this.conversationsRepo
      .watchMessages$(conversationIri, watchMessagesOptions)
      .pipe(takeUntilDestroyed(this.destroyRef), takeUntil(this.stopSelectedSse$))
      .subscribe(() => {
        this.scrollMessagesToBottom();
        this.conversationsRepo.fetch$(conversationIri).subscribe(() => undefined);
      });

    queueMicrotask(() => this.composer?.nativeElement?.focus());
  }

  watchOne() {
    const iri = this.selectedId();
    if (iri) {
      this.watchOneSub?.unsubscribe();
      const options = this.watchOptions(this.realtimeWatchForm.controls.watchOneNewConnection.value);
      this.watchOneSub = this.conversationsRepo.watch$(iri as IriRequired, options).subscribe(() => undefined);
    }
  }

  unwatchOne() {
    const id = this.selectedId();
    if (id) {
      this.watchOneSub?.unsubscribe();
      this.watchOneSub = undefined;
      this.conversationsRepo.unwatch(id as IriRequired);
    }
  }

  manualGet() {
    const iri = this.selectedId();
    if (!iri) return;
    this.conversationsRepo
      .fetch$(iri as IriRequired)
      .subscribe((res) => this.pushLog({t: Date.now(), kind: 'manual-get', iri, snapshot: res}));
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

    this.conversationsRepo
      .patch$(iri as IriRequired, payload)
      .subscribe((res) => this.pushLog({t: Date.now(), kind: 'patch', iri, snapshot: res}));
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
    this.messagesRepo
      .create$(conv['@id'] as IriRequired, text)
      .subscribe({
        next: () => {
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

    this.conversationsRepo.create$(payload).subscribe({
      next: (res) => {
        this.pushLog({t: Date.now(), kind: 'update', iri: res['@id'], snapshot: res});
        this.loading.set(false);
        this.createForm.reset({title: 'New conversation', externalId: ''});
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to create conversation');
        this.loading.set(false);
      },
    });
  }

  removeSelected() {
    const iri = this.selectedId();
    if (!iri) return;
    this.stopSelectedSse$.next();
    this.conversationsRepo.delete$(iri as IriRequired).subscribe(() => {
      this.selectedId.set(undefined);
      this.selectedMessagesSource.set(null);
      this.pushLog({t: Date.now(), kind: 'update', iri, snapshot: {deleted: true}});
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
    const author = (m as any)?.author;

    // API Platform can embed the author object in JSON-LD.
    if (author && typeof author === 'object') {
      const displayName = (author as any)?.displayName;
      if (typeof displayName === 'string' && displayName.trim() !== '') return displayName;

      const email = (author as any)?.email;
      if (typeof email === 'string' && email.trim() !== '') return email;

      const id = this.extractNumericId(author);
      if (id) return `User #${id}`;
      return 'Unknown';
    }

    const id = this.extractNumericId(author);
    if (id) return `User #${id}`;
    return typeof author === 'string' && author.trim() !== '' ? author : 'Unknown';
  }

  formatTime(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  }

  private extractNumericId(input?: unknown): number | null {
    if (!input) return null;

    if (typeof input === 'number') {
      return Number.isFinite(input) ? input : null;
    }

    const iri =
      typeof input === 'string'
        ? input
        : typeof (input as any)?.['@id'] === 'string'
          ? (input as any)['@id']
          : undefined;

    const numericId = typeof (input as any)?.id === 'number' ? (input as any).id : undefined;
    if (typeof numericId === 'number') return numericId;

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

  private watchOptions(forceDedicatedConnection: boolean): WatchConnectionOptions | undefined {
    return forceDedicatedConnection ? {newConnection: true} : undefined;
  }
}
