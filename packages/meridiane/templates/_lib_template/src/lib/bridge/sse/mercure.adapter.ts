import {Inject, Injectable, OnDestroy, Optional, PLATFORM_ID} from '@angular/core';
import {BehaviorSubject, defer, EMPTY, fromEvent, Observable, of, Subject} from 'rxjs';
import {auditTime, concatMap, filter, finalize, map, share, takeUntil} from 'rxjs/operators';
import {API_BASE_URL, BRIDGE_LOGGER, BRIDGE_WITH_CREDENTIALS, MERCURE_HUB_URL, MERCURE_TOPIC_MODE} from '../../tokens';
import {BridgeLogger, MercureTopicMode} from '../../bridge.types';
import {RealtimeEvent, RealtimePort, RealtimeStatus, SubscribeFilter} from '../../ports/realtime.port';
import {EventSourceWrapper} from './eventsource-wrapper';
import {Item} from '../../ports/resource-repository.port';
import {isPlatformBrowser} from '@angular/common';
import {MercureUrlBuilder} from './mercure-url.builder';
import {RefCountTopicRegistry} from './ref-count-topic.registry';
import {MercureTopicMapper} from './mercure-topic.mapper';


@Injectable({providedIn: 'root'})
export class MercureRealtimeAdapter implements RealtimePort, OnDestroy {
  private lastEventId?: string;
  private es?: EventSourceWrapper;
  private currentKey?: string;

  private readonly topicsRegistry = new RefCountTopicRegistry();
  private readonly urlBuilder: MercureUrlBuilder;
  private readonly topicMapper: MercureTopicMapper;

  private readonly destroy$ = new Subject<void>();
  private connectionStop$ = new Subject<void>();
  private readonly rebuild$ = new Subject<void>();
  private shuttingDown = false;

  private readonly _status$ = new BehaviorSubject<RealtimeStatus>('closed');
  private readonly incoming$ = new Subject<{ type: string; data: string }>();

  constructor(
    @Inject(API_BASE_URL) private readonly apiBase: string,
    @Inject(BRIDGE_WITH_CREDENTIALS) private readonly withCredentialsDefault: boolean,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Optional() @Inject(MERCURE_HUB_URL) private readonly hubUrl?: string,
    @Optional() @Inject(MERCURE_TOPIC_MODE) topicMode?: MercureTopicMode,
    @Optional() @Inject(BRIDGE_LOGGER) private readonly logger?: BridgeLogger,
  ) {
    this.urlBuilder = new MercureUrlBuilder();
    // `topicMode` affects only the `topic=` query param sent to the hub.
    // Payload IRIs are always matched using same-origin relative IRIs (`/api/...`) when possible.
    this.topicMapper = new MercureTopicMapper(apiBase, topicMode ?? 'url');

    this.rebuild$
      .pipe(
        auditTime(10),
        concatMap(() => this.rebuildOnce$()),
      )
      .subscribe();

    if (isPlatformBrowser(this.platformId)) {
      fromEvent<PageTransitionEvent>(window, 'pagehide')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.shutdownBeforeExit());

      fromEvent<BeforeUnloadEvent>(window, 'beforeunload')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.shutdownBeforeExit());
    }
  }

  // ──────────────── API publique ────────────────

  status$(): Observable<RealtimeStatus> {
    return this._status$.asObservable();
  }


  subscribe$<T>(iris: string[], subscribeFilter?: SubscribeFilter): Observable<RealtimeEvent<T>> {
    return defer(() => {
      const inputIris = iris.filter((v): v is string => typeof v === 'string' && v.length > 0);
      if (inputIris.length === 0) return EMPTY;

      if (!this.hubUrl) {
        this.logger?.debug?.('[Mercure] hubUrl not configured → realtime disabled');
        return EMPTY;
      }

      // Canonicalise topics (ref-count + URL) to avoid duplicates like:
      // - "/api/conversations/1" and "http://localhost:8000/api/conversations/1"
      const registeredTopics = Array.from(new Set(inputIris.map((i) => this.topicMapper.toTopic(i))));

      this.topicsRegistry.addAll(registeredTopics);
      this.scheduleRebuild();

      // Matching is done against the payload IRIs (typically "/api/...").
      const subscribed = inputIris.map((i) => normalizeIri(this.topicMapper.toPayloadIri(i)));
      const fieldPaths = buildFieldPaths(subscribeFilter);
      const includeSelf = resolveIncludeSelf(subscribeFilter, {hasFields: fieldPaths.length > 0});

      return this.incoming$.pipe(
        map((evt) => this.safeParse(evt.data)),
        filter((raw): raw is Item => !!raw && typeof raw === 'object' && !Array.isArray(raw)),
        map((payload) => {
          const topic = this.matchSubscribedTopic(payload, subscribed, {fieldPaths, includeSelf});
          if (!topic) return undefined;

          const rawId = payload?.['@id'];
          const iri = typeof rawId === 'string' ? rawId : topic;
          return {topic, iri, data: payload as T} as RealtimeEvent<T>;
        }),
        filter((e): e is RealtimeEvent<T> => !!e),
        finalize(() => this.unsubscribeRegisteredTopics(registeredTopics)),
        share()
      );
    });
  }

  subscribeAll$<T>(iris: string[]): Observable<RealtimeEvent<T>> {
    return defer(() => {
      const inputIris = iris.filter((v): v is string => typeof v === 'string' && v.length > 0);
      if (inputIris.length === 0) return EMPTY;

      if (!this.hubUrl) {
        this.logger?.debug?.('[Mercure] hubUrl not configured → realtime disabled');
        return EMPTY;
      }

      const registeredTopics = Array.from(new Set(inputIris.map((i) => this.topicMapper.toTopic(i))));

      this.topicsRegistry.addAll(registeredTopics);
      this.scheduleRebuild();

      return this.incoming$.pipe(
        map((evt) => this.safeParse(evt.data)),
        filter((raw): raw is Item => !!raw && typeof raw === 'object' && !Array.isArray(raw)),
        map((payload: any) => {
          const rawId = payload?.['@id'];
          const iri = typeof rawId === 'string' ? rawId : '';
          return {iri, data: payload as T} as RealtimeEvent<T>;
        }),
        finalize(() => this.unsubscribeRegisteredTopics(registeredTopics)),
        share()
      );
    });
  }

  unsubscribe(iris: string[]): void {
    const inputIris = iris.filter((v): v is string => typeof v === 'string' && v.length > 0);
    if (inputIris.length === 0) return;
    const topics = Array.from(new Set(inputIris.map((i) => this.topicMapper.toTopic(i))));
    this.topicsRegistry.removeAll(topics);
    this.scheduleRebuild();
  }

  public shutdownBeforeExit(): void {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    this.teardownConnection();
  }

  ngOnDestroy(): void {
    this.teardownConnection();
    this._status$.complete();
    this.incoming$.complete();
    this.destroy$.next();
    this.destroy$.complete();
    this.rebuild$.complete();
  }

  // ───────────────── PRIVATE ─────────────────

  private scheduleRebuild(): void {
    if (this.shuttingDown) return;
    this.rebuild$.next();
  }

  private rebuildOnce$() {
    return defer(() => {
      if (this.shuttingDown) return of(void 0);

      try {
        if (!this.hubUrl) {
          this.currentKey = undefined;
          this._status$.next('closed');
          return of(void 0);
        }

        const hasTopics = this.topicsRegistry.hasAny();
        const key = hasTopics ? this.topicsRegistry.computeKey(this.hubUrl, this.withCredentialsDefault) : undefined;

        if (!hasTopics) {
          if (this.es) this.teardownConnection();
          this.currentKey = undefined;
          this._status$.next('closed');
          return of(void 0);
        }

        if (key && key === this.currentKey) {
          return of(void 0);
        }

        this.teardownConnection();

        const url = this.urlBuilder.build(this.hubUrl, this.topicsRegistry.snapshot(), this.lastEventId);
        this.logger?.debug?.('[Mercure] connect', {hubUrl: this.hubUrl, topics: this.topicsRegistry.snapshot(), lastEventId: this.lastEventId});
        this.es = new EventSourceWrapper(url, {withCredentials: this.withCredentialsDefault}, this.logger);

        this.connectionStop$ = new Subject<void>();

        this.es.status$
          .pipe(takeUntil(this.connectionStop$), takeUntil(this.destroy$))
          .subscribe((st) => this.updateGlobalStatus(st));

        this.es.events$
          .pipe(takeUntil(this.connectionStop$), takeUntil(this.destroy$))
          .subscribe((e) => {
            this.lastEventId = e.lastEventId ?? this.lastEventId;
            this.incoming$.next(e);
          });

        this._status$.next('connecting');
        this.es.open();
        this.currentKey = key;
      } catch (err) {
        this.logger?.error?.('[Mercure] rebuild failed:', err);
        this.currentKey = undefined;
        this._status$.next(this.topicsRegistry.hasAny() ? 'connecting' : 'closed');
      }

      return of(void 0);
    });
  }

  private teardownConnection(): void {
    this.es?.close();
    this.es = undefined;
    this.connectionStop$.next();
    this.connectionStop$.complete();
  }

  private updateGlobalStatus(sse: RealtimeStatus): void {
    if (sse === 'connected') {
      this._status$.next('connected');
      return;
    }
    if (sse === 'connecting') {
      this._status$.next('connecting');
      return;
    }
    this._status$.next(this.topicsRegistry.hasAny() ? 'connecting' : 'closed');
  }

  private safeParse(raw: string): Item | undefined {
    try {
      return JSON.parse(raw) as Item;
    } catch (err) {
      this.logger?.debug?.('[Mercure] invalid JSON payload ignored', {raw});
      return undefined;
    }
  }

  private unsubscribeRegisteredTopics(topics: string[]): void {
    this.topicsRegistry.removeAll(topics);
    this.scheduleRebuild();
  }

  private extractRelationIris(raw: any, path: string): string[] {
    const readPath = (obj: any, dotPath: string): any => {
      return dotPath
        .split('.')
        .filter(Boolean)
        .reduce((acc, key) => acc?.[key], obj);
    };

    const normalize = (value: any): string[] => {
      if (!value) return [];
      if (typeof value === 'string') return value.length > 0 ? [value] : [];
      if (typeof value === 'object' && typeof value['@id'] === 'string') return [value['@id']];
      if (Array.isArray(value)) return value.flatMap(normalize);
      return [];
    };

    return normalize(readPath(raw, path));
  }

  private matchSubscribedTopic(
    raw: any,
    subscribed: string[],
    opts: { fieldPaths: string[]; includeSelf: boolean }
  ): string | undefined {
    for (const fieldPath of opts.fieldPaths) {
      const relIris = this.extractRelationIris(raw, fieldPath).map((i) => normalizeIri(this.topicMapper.toPayloadIri(i)));
      for (const relIri of relIris) {
        const match = findMatchingSubscribedTopic(relIri, subscribed);
        if (match) return match;
      }
    }

    if (opts.includeSelf) {
      const rawId = raw?.['@id'];
      const id = typeof rawId === 'string' ? normalizeIri(this.topicMapper.toPayloadIri(rawId)) : undefined;
      if (typeof id === 'string') {
        const match = findMatchingSubscribedTopic(id, subscribed);
        if (match) return match;
      }
    }

    return undefined;
  }

}

function normalizeIri(iri: string): string {
  return iri.endsWith('/') ? iri.slice(0, -1) : iri;
}

function findMatchingSubscribedTopic(candidate: string, subscribed: string[]): string | undefined {
  let best: string | undefined;
  for (const iri of subscribed) {
    if (candidate !== iri && !candidate.startsWith(`${iri}/`)) continue;
    if (!best || iri.length > best.length) best = iri;
  }
  return best;
}

function buildFieldPaths(filter?: SubscribeFilter): string[] {
  const fields = filter?.fields?.filter((f): f is string => typeof f === 'string' && f.length > 0) ?? [];
  const field = typeof filter?.field === 'string' && filter.field.length > 0 ? [filter.field] : [];
  return [...fields, ...field];
}

function resolveIncludeSelf(filter: SubscribeFilter | undefined, ctx: { hasFields: boolean }): boolean {
  if (typeof filter?.includeSelf === 'boolean') return filter.includeSelf;
  return !ctx.hasFields;
}
