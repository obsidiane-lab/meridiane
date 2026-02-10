import {Component, computed, inject, OnDestroy, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {BridgeFacade, Item, WatchTypesResult} from '@obsidiane/bridge-sandbox';
import {JsonViewerComponent} from '../shared/json-viewer.component';
import {BACKEND_BASE_URL} from '../../core/backend';
import {ConversationRepository} from '../../data/repositories/conversation.repository';
import {Subscription} from 'rxjs';

type DynamicRegistry = Record<string, Item>;
type TypedEvent = WatchTypesResult<DynamicRegistry>;

type WatchSubscriptionEntry = {
  id: string;
  name: string;
  topic: string;
  typesInput: string;
  discriminator: string;
  running: boolean;
  count: number;
  lastType?: string;
  lastIri?: string;
  lastAt?: number;
};

type EventEntry = {
  id: string;
  t: number;
  subscriptionId: string;
  subscriptionName: string;
  topic: string;
  evt: TypedEvent;
};

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
  readonly publishing = signal(false);

  readonly addSubForm = this.fb.nonNullable.group({
    name: ['events-me'],
    topic: ['/api/events/me', [Validators.required]],
    types: ['Message, Conversation', [Validators.required]],
    discriminator: ['@type', [Validators.required]],
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
      }),
    ]);
  }

  ngOnDestroy(): void {
    this.stopAll();
  }

  addSubscription(): void {
    if (this.addSubForm.invalid) {
      this.addSubForm.markAllAsTouched();
      return;
    }

    const value = this.addSubForm.getRawValue();
    const topic = value.topic.trim();
    const typesInput = value.types.trim();
    const discriminator = value.discriminator.trim() || '@type';
    const name = value.name.trim() || `sub-${this.subSeq}`;
    const types = parseTypes(typesInput);
    if (!topic || types.length === 0) {
      this.err.set('Subscription invalide: topic requis et au moins un type requis.');
      return;
    }

    this._subscriptions.update((list) => [
      ...list,
      this.createSubscription({
        name,
        topic,
        typesInput: types.join(', '),
        discriminator,
      }),
    ]);

    this.err.set(null);
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
      {discriminator: subConfig.discriminator || '@type'}
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

  private createSubscription(input: {
    name: string;
    topic: string;
    typesInput: string;
    discriminator: string;
  }): WatchSubscriptionEntry {
    return {
      id: `sub-${this.subSeq++}`,
      name: input.name,
      topic: input.topic,
      typesInput: input.typesInput,
      discriminator: input.discriminator,
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
}

function parseTypes(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\n]/g)
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
    )
  );
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

function readHttpError(e: any): string {
  const detail = e?.error?.detail;
  const title = e?.error?.title;
  const message = e?.message;

  if (typeof detail === 'string' && detail.length > 0) return detail;
  if (typeof title === 'string' && title.length > 0) return title;
  if (typeof message === 'string' && message.length > 0) return message;
  return 'Request failed';
}
