import {Component, computed, inject, OnDestroy, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {BridgeFacade, Item, RealtimeDiagnostics, WatchTypesResult} from '@obsidiane/bridge-sandbox';
import {JsonViewerComponent} from '../shared/json-viewer.component';
import {BACKEND_BASE_URL} from '../../core/backend';
import {ConversationRepository} from '../../data/repositories/conversation.repository';
import {Observable, of, Subscription} from 'rxjs';
import {
  readSandboxRealtimeConfig,
  resetSandboxRealtimeConfig,
  saveSandboxRealtimeConfig,
  SandboxRealtimeConfig
} from '../../core/realtime-config';
import {
  normalizeTopic,
  parseTypes,
  planBulkSubscriptions,
  planSingleSubscription
} from './watch-types-lab.logic';

type DynamicRegistry = Record<string, Item>;
type TypedEvent = WatchTypesResult<DynamicRegistry>;

interface WatchSubscriptionEntry {
  id: string;
  name: string;
  topic: string;
  typesInput: string;
  discriminator: string;
  newConnection: boolean;
  running: boolean;
  count: number;
  lastType?: string;
  lastIri?: string;
  lastAt?: number;
}

interface EventEntry {
  id: string;
  t: number;
  subscriptionId: string;
  subscriptionName: string;
  topic: string;
  evt: TypedEvent;
}

const BULK_CONFIRM_THRESHOLD = 5;
const MAX_SUBSCRIPTIONS = 300;

@Component({
  selector: 'app-watch-types-lab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  templateUrl: './watch-types-lab.component.html',
  styleUrls: ['./watch-types-lab.component.css'],
})
export class WatchTypesLabComponent implements OnDestroy {
  private readonly bridge = inject(BridgeFacade);
  private readonly conversationsRepo = inject(ConversationRepository);
  private readonly fb = inject(FormBuilder);

  readonly status = this.conversationsRepo.status;
  readonly err = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly publishing = signal(false);
  readonly runtimeConfig = signal<SandboxRealtimeConfig>(readSandboxRealtimeConfig());
  readonly bulkConfirmThreshold = BULK_CONFIRM_THRESHOLD;
  readonly maxSubscriptions = MAX_SUBSCRIPTIONS;

  readonly runtimeConfigForm = this.fb.nonNullable.group({
    connectionMode: [this.runtimeConfig().connectionMode],
    maxUrlLength: [this.runtimeConfig().maxUrlLength, [Validators.required, Validators.min(256)]],
  });

  readonly diagnostics = toSignal(
    this.createDiagnosticsStream(),
    {initialValue: emptyRealtimeDiagnostics(this.runtimeConfig())}
  );

  readonly addSubForm = this.fb.nonNullable.group({
    name: ['events-me'],
    topic: ['/api/events/me', [Validators.required]],
    types: ['Message, Conversation', [Validators.required]],
    discriminator: ['@type', [Validators.required]],
    newConnection: [false],
  });

  readonly bulkAddForm = this.fb.nonNullable.group({
    topicPrefix: ['/api/events/topic-', [Validators.required]],
    count: [1, [Validators.required, Validators.min(1), Validators.max(200)]],
    types: ['Message, Conversation', [Validators.required]],
    discriminator: ['@type', [Validators.required]],
    newConnection: [false],
    confirmLargeBatch: [false],
  });

  readonly publishForm = this.fb.nonNullable.group({
    topic: ['/api/events/me', [Validators.required]],
    eventType: ['Message', [Validators.required]],
    iri: [''],
    extraJson: ['{}', [Validators.required]],
  });

  private readonly _subscriptions = signal<WatchSubscriptionEntry[]>([]);
  readonly subscriptions = this._subscriptions.asReadonly();

  private readonly _events = signal<EventEntry[]>([]);
  readonly events = this._events.asReadonly();

  readonly activeSubscriptionsCount = computed(() => this._subscriptions().filter((s) => s.running).length);
  readonly totalEventCount = computed(() => this._events().length);
  readonly activeConnectionsCount = computed(() => this.diagnostics().totalConnections);
  readonly lastEvent = computed(() => {
    const events = this._events();
    return events.length > 0 ? events[events.length - 1] : null;
  });

  private readonly runningSubs = new Map<string, Subscription>();
  private subSeq = 1;
  private evtSeq = 1;

  constructor() {
    this._subscriptions.set([
      this.createSubscription({
        name: 'events-me',
        topic: '/api/events/me',
        typesInput: 'Message, Conversation',
        discriminator: '@type',
        newConnection: false,
      }),
    ]);
  }

  ngOnDestroy(): void {
    this.stopAll();
  }

  applyRuntimeConfig(): void {
    if (this.runtimeConfigForm.invalid) {
      this.runtimeConfigForm.markAllAsTouched();
      return;
    }

    const value = this.runtimeConfigForm.getRawValue();
    const saved = saveSandboxRealtimeConfig({
      connectionMode: value.connectionMode,
      maxUrlLength: value.maxUrlLength,
    });
    this.runtimeConfig.set(saved);
    window.location.reload();
  }

  resetRuntimeConfig(): void {
    const next = resetSandboxRealtimeConfig();
    this.runtimeConfig.set(next);
    window.location.reload();
  }

  addSubscription(): void {
    if (this.addSubForm.invalid) {
      this.addSubForm.markAllAsTouched();
      return;
    }

    if (this._subscriptions().length >= MAX_SUBSCRIPTIONS) {
      this.err.set(`Limite atteinte (${MAX_SUBSCRIPTIONS} subscriptions max).`);
      return;
    }

    const value = this.addSubForm.getRawValue();
    const planned = planSingleSubscription({
      name: value.name.trim() || `sub-${this.subSeq}`,
      topic: value.topic,
      typesInput: value.types,
      discriminator: value.discriminator,
      newConnection: value.newConnection,
    });

    if (!planned.ok) {
      this.notice.set(null);
      this.err.set(planned.error);
      return;
    }

    const entry = planned.entries[0];
    this._subscriptions.update((list) => [...list, this.createSubscription(entry)]);

    this.notice.set('Subscription ajoutee.');
    this.err.set(null);
  }

  addBulkSubscriptions(): void {
    if (this.bulkAddForm.invalid) {
      this.bulkAddForm.markAllAsTouched();
      return;
    }

    const value = this.bulkAddForm.getRawValue();
    const planned = planBulkSubscriptions({
      topicPrefix: value.topicPrefix,
      count: value.count,
      typesInput: value.types,
      discriminator: value.discriminator,
      newConnection: value.newConnection,
      confirmLargeBatch: value.confirmLargeBatch,
      currentTotal: this._subscriptions().length,
      maxSubscriptions: MAX_SUBSCRIPTIONS,
      largeBatchThreshold: BULK_CONFIRM_THRESHOLD,
    });

    if (!planned.ok) {
      this.notice.set(null);
      this.err.set(planned.error);
      return;
    }

    this._subscriptions.update((list) => {
      const next = [...list];
      for (const entry of planned.entries) {
        next.push(this.createSubscription(entry));
      }
      return next;
    });

    this.notice.set(`${planned.entries.length} subscriptions ajoutees.`);
    this.err.set(null);
    if (value.count > BULK_CONFIRM_THRESHOLD) {
      this.bulkAddForm.patchValue({confirmLargeBatch: false});
    }
  }

  removeSubscription(id: string): void {
    this.stopSubscription(id);
    this._subscriptions.update((list) => list.filter((s) => s.id !== id));
  }

  startSubscription(id: string): void {
    const subConfig = this._subscriptions().find((s) => s.id === id);
    if (!subConfig || subConfig.running) return;

    const types = parseTypes(subConfig.typesInput);
    if (types.length === 0) {
      this.err.set(`Aucun type valide pour ${subConfig.name}.`);
      return;
    }

    this.err.set(null);

    const sub = this.bridge.watchTypes$<DynamicRegistry>(
      subConfig.topic,
      types,
      {discriminator: subConfig.discriminator || '@type'},
      {newConnection: subConfig.newConnection}
    ).subscribe({
      next: (evt: TypedEvent) => this.pushEvent(subConfig, evt),
      error: (e: unknown) => {
        this.err.set(`Erreur subscription ${subConfig.name}: ${readHttpError(e)}`);
        this.stopSubscription(subConfig.id);
      },
    });

    this.runningSubs.set(subConfig.id, sub);
    this.patchSubscription(subConfig.id, {running: true});
  }

  stopSubscription(id: string): void {
    const sub = this.runningSubs.get(id);
    sub?.unsubscribe();
    this.runningSubs.delete(id);
    this.patchSubscription(id, {running: false});
  }

  startAll(): void {
    for (const entry of this._subscriptions()) {
      this.startSubscription(entry.id);
    }
  }

  stopAll(): void {
    for (const id of Array.from(this.runningSubs.keys())) {
      this.stopSubscription(id);
    }
  }

  clearEvents(): void {
    this._events.set([]);
    this._subscriptions.update((list) => list.map((s) => ({
      ...s,
      count: 0,
      lastType: undefined,
      lastIri: undefined,
      lastAt: undefined,
    })));
  }

  useForPublish(id: string): void {
    const subConfig = this._subscriptions().find((s) => s.id === id);
    if (!subConfig) return;

    const types = parseTypes(subConfig.typesInput);
    this.publishForm.patchValue({
      topic: subConfig.topic,
      eventType: types[0] ?? '',
    });
  }

  useEventsTopicForPublish(): void {
    this.publishForm.patchValue({topic: '/api/events/me'});
  }

  publishTypedEvent(): void {
    if (this.publishForm.invalid) {
      this.publishForm.markAllAsTouched();
      return;
    }

    const value = this.publishForm.getRawValue();
    const topic = value.topic.trim();
    const eventType = value.eventType.trim();
    const iri = value.iri.trim();

    if (!topic || !eventType) {
      this.err.set('Publication invalide: topic et eventType requis.');
      return;
    }

    const extra = parseJsonObject(value.extraJson);
    if (!extra.ok) {
      this.err.set(extra.error);
      return;
    }

    const payload: Record<string, unknown> = {...extra.value};
    payload['@type'] = eventType;

    if (iri.length > 0) {
      payload['@id'] = iri;
    } else if (typeof payload['@id'] !== 'string' || payload['@id'].length === 0) {
      payload['@id'] = this.buildSyntheticIri(eventType);
    }

    this.err.set(null);
    this.publishing.set(true);

    this.bridge.post$<{ ok: boolean }>('/test/mercure/publish', {
      topic: this.resolveBackendIri(topic),
      payload,
    }).subscribe({
      next: () => this.publishing.set(false),
      error: (e) => {
        this.publishing.set(false);
        this.err.set(readHttpError(e));
      },
    });
  }

  listTypes(raw: string): string[] {
    return parseTypes(raw);
  }

  payloadIri(evt: TypedEvent): string {
    const iri = (evt.payload as Item | undefined)?.['@id'];
    return typeof iri === 'string' ? iri : '-';
  }

  topicsPreview(topics: string[]): string {
    const limit = 3;
    if (topics.length <= limit) return topics.join(' | ');
    const head = topics.slice(0, limit).join(' | ');
    return `${head} | +${topics.length - limit}`;
  }

  private createSubscription(input: {
    name: string;
    topic: string;
    typesInput: string;
    discriminator: string;
    newConnection: boolean;
  }): WatchSubscriptionEntry {
    return {
      id: `sub-${this.subSeq++}`,
      name: input.name,
      topic: normalizeTopic(input.topic),
      typesInput: input.typesInput,
      discriminator: input.discriminator,
      newConnection: input.newConnection,
      running: false,
      count: 0,
    };
  }

  private patchSubscription(id: string, patch: Partial<WatchSubscriptionEntry>): void {
    this._subscriptions.update((list) =>
      list.map((entry) => (entry.id === id ? {...entry, ...patch} : entry))
    );
  }

  private pushEvent(sub: WatchSubscriptionEntry, evt: TypedEvent): void {
    const now = Date.now();
    const iri = this.payloadIri(evt);

    this._events.update((list) => {
      const next = [...list, {
        id: `evt-${this.evtSeq++}`,
        t: now,
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        topic: sub.topic,
        evt,
      }];
      if (next.length > 400) next.splice(0, next.length - 400);
      return next;
    });

    this._subscriptions.update((list) =>
      list.map((entry) => {
        if (entry.id !== sub.id) return entry;
        return {
          ...entry,
          count: entry.count + 1,
          lastType: evt.resourceType,
          lastIri: iri !== '-' ? iri : undefined,
          lastAt: now,
        };
      })
    );
  }

  private buildSyntheticIri(eventType: string): string {
    const slug = eventType
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'event';
    return `/api/${slug}/sample-${Date.now()}`;
  }

  private resolveBackendIri(iri: string): string {
    try {
      return new URL(iri, BACKEND_BASE_URL).toString();
    } catch {
      return iri;
    }
  }

  private createDiagnosticsStream(): Observable<RealtimeDiagnostics> {
    const bridgeRuntime = this.bridge as BridgeFacade & {
      realtimeDiagnostics$?: () => Observable<RealtimeDiagnostics>;
    };
    if (typeof bridgeRuntime.realtimeDiagnostics$ === 'function') {
      return bridgeRuntime.realtimeDiagnostics$();
    }

    this.err.set(
      'Bridge runtime stale: realtimeDiagnostics$ absent. Relance `npm run sandbox:bridge` puis redemarre `npm run sandbox:dev`.'
    );
    return of(emptyRealtimeDiagnostics(this.runtimeConfig()));
  }

}

function emptyRealtimeDiagnostics(config: SandboxRealtimeConfig): RealtimeDiagnostics {
  return {
    mode: config.connectionMode,
    maxUrlLength: config.maxUrlLength,
    totalConnections: 0,
    sharedConnections: 0,
    dedicatedConnections: 0,
    connections: [],
  };
}

function parseJsonObject(raw: string): {ok: true; value: Record<string, unknown>} | {ok: false; error: string} {
  const source = raw.trim();
  if (source.length === 0) return {ok: true, value: {}};

  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {ok: false, error: 'extraJson doit etre un objet JSON (ex: {"conversation":"/api/conversations/1"}).'};
    }
    return {ok: true, value: parsed as Record<string, unknown>};
  } catch {
    return {ok: false, error: 'extraJson invalide: JSON non parseable.'};
  }
}

function readHttpError(e: unknown): string {
  if (!e || typeof e !== 'object') return 'Request failed';

  const cast = e as {
    error?: {detail?: unknown; title?: unknown};
    message?: unknown;
  };
  const detail = cast.error?.detail;
  const title = cast.error?.title;
  const message = cast.message;

  if (typeof detail === 'string' && detail.length > 0) return detail;
  if (typeof title === 'string' && title.length > 0) return title;
  if (typeof message === 'string' && message.length > 0) return message;
  return 'Request failed';
}
