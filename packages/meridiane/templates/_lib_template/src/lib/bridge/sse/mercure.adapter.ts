import {Inject, Injectable, OnDestroy, Optional, PLATFORM_ID} from '@angular/core';
import {BehaviorSubject, defer, EMPTY, fromEvent, Observable, of, Subject} from 'rxjs';
import {auditTime, concatMap, filter, finalize, map, share, takeUntil} from 'rxjs/operators';
import {
  API_BASE_URL,
  BRIDGE_LOGGER,
  BRIDGE_WITH_CREDENTIALS,
  MERCURE_CONNECTION_MODE,
  MERCURE_HUB_URL,
  MERCURE_MAX_URL_LENGTH,
  MERCURE_TOPIC_MODE,
} from '../../tokens';
import {
  BridgeLogger,
  MercureConnectionMode,
  MercureTopicMode,
  RealtimeDiagnostics,
  WatchConnectionOptions,
} from '../../bridge.types';
import {RealtimeEvent, RealtimePort, RealtimeStatus, SubscribeFilter} from '../../ports/realtime.port';
import {EventSourceWrapper} from './eventsource-wrapper';
import {Item} from '../../ports/resource-repository.port';
import {isPlatformBrowser} from '@angular/common';
import {MercureUrlBuilder} from './mercure-url.builder';
import {RefCountTopicRegistry} from './ref-count-topic.registry';
import {MercureTopicMapper} from './mercure-topic.mapper';

type IncomingMessage = { type: string; data: string; lastEventId?: string };

type ManagedConnectionScope = 'shared' | 'dedicated';

type ManagedConnection = {
  id: string;
  key: string;
  scope: ManagedConnectionScope;
  groupId?: string;
  topics: ReadonlySet<string>;
  urlLength: number;
  wrapper: EventSourceWrapper;
  stop$: Subject<void>;
  status: RealtimeStatus;
};

@Injectable({providedIn: 'root'})
export class MercureRealtimeAdapter implements RealtimePort, OnDestroy {
  private readonly connectionMode: MercureConnectionMode;
  private readonly maxUrlLength: number;

  private readonly topicsRegistry = new RefCountTopicRegistry();
  private readonly urlBuilder: MercureUrlBuilder;
  private readonly topicMapper: MercureTopicMapper;

  private readonly sharedConnections = new Map<string, ManagedConnection>();
  private readonly connections = new Map<string, ManagedConnection>();
  private readonly dedicatedGroups = new Map<string, Set<string>>();
  private readonly dedicatedGroupTopics = new Map<string, Set<string>>();
  private readonly lastEventIdByKey = new Map<string, string>();

  private readonly destroy$ = new Subject<void>();
  private readonly sharedRebuild$ = new Subject<void>();
  private shuttingDown = false;
  private sequence = 0;

  private readonly _status$ = new BehaviorSubject<RealtimeStatus>('closed');
  private readonly _diagnostics$ = new BehaviorSubject<RealtimeDiagnostics>(emptyDiagnostics('auto', 1900));
  private readonly incoming$ = new Subject<IncomingMessage>();

  constructor(
    @Inject(API_BASE_URL) private readonly apiBase: string,
    @Inject(BRIDGE_WITH_CREDENTIALS) private readonly withCredentialsDefault: boolean,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Optional() @Inject(MERCURE_HUB_URL) private readonly hubUrl?: string,
    @Optional() @Inject(MERCURE_TOPIC_MODE) topicMode?: MercureTopicMode,
    @Optional() @Inject(MERCURE_CONNECTION_MODE) connectionMode?: MercureConnectionMode | null,
    @Optional() @Inject(MERCURE_MAX_URL_LENGTH) maxUrlLength?: number | null,
    @Optional() @Inject(BRIDGE_LOGGER) private readonly logger?: BridgeLogger,
  ) {
    this.connectionMode = connectionMode ?? 'auto';
    this.maxUrlLength = normalizeMaxUrlLength(maxUrlLength, 1900);
    this.emitDiagnostics();

    this.urlBuilder = new MercureUrlBuilder();
    // `topicMode` affects only the `topic=` query param sent to the hub.
    // Payload IRIs are always matched using same-origin relative IRIs (`/api/...`) when possible.
    this.topicMapper = new MercureTopicMapper(apiBase, topicMode ?? 'url');

    this.sharedRebuild$
      .pipe(
        auditTime(10),
        concatMap(() => this.rebuildSharedConnectionsOnce$()),
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

  diagnostics$(): Observable<RealtimeDiagnostics> {
    return this._diagnostics$.asObservable();
  }

  subscribe$<T>(
    iris: string[],
    subscribeFilter?: SubscribeFilter,
    options?: WatchConnectionOptions
  ): Observable<RealtimeEvent<T>> {
    return defer(() => {
      const inputIris = iris.filter((v): v is string => typeof v === 'string' && v.length > 0);
      if (inputIris.length === 0) return EMPTY;

      if (!this.hubUrl) {
        this.logger?.debug?.('[Mercure] hubUrl not configured → realtime disabled');
        return EMPTY;
      }

      const registeredTopics = Array.from(new Set(inputIris.map((i) => this.topicMapper.toTopic(i))));
      const source$ = this.buildIncomingStream$(registeredTopics, options);

      // Matching is done against the payload IRIs (typically "/api/...").
      const subscribed = inputIris.map((i) => normalizeIri(this.topicMapper.toPayloadIri(i)));
      const fieldPaths = buildFieldPaths(subscribeFilter);
      const includeSelf = resolveIncludeSelf(subscribeFilter, {hasFields: fieldPaths.length > 0});

      return source$.pipe(
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
        share()
      );
    });
  }

  subscribeAll$<T>(iris: string[], options?: WatchConnectionOptions): Observable<RealtimeEvent<T>> {
    return defer(() => {
      const inputIris = iris.filter((v): v is string => typeof v === 'string' && v.length > 0);
      if (inputIris.length === 0) return EMPTY;

      if (!this.hubUrl) {
        this.logger?.debug?.('[Mercure] hubUrl not configured → realtime disabled');
        return EMPTY;
      }

      const registeredTopics = Array.from(new Set(inputIris.map((i) => this.topicMapper.toTopic(i))));
      const source$ = this.buildIncomingStream$(registeredTopics, options);

      return source$.pipe(
        map((evt) => this.safeParse(evt.data)),
        filter((raw): raw is Item => !!raw && typeof raw === 'object' && !Array.isArray(raw)),
        map((payload: any) => {
          const rawId = payload?.['@id'];
          const iri = typeof rawId === 'string' ? rawId : '';
          return {iri, data: payload as T} as RealtimeEvent<T>;
        }),
        share()
      );
    });
  }

  unsubscribe(iris: string[]): void {
    const inputIris = iris.filter((v): v is string => typeof v === 'string' && v.length > 0);
    if (inputIris.length === 0) return;

    const topics = Array.from(new Set(inputIris.map((i) => this.topicMapper.toTopic(i))));

    this.topicsRegistry.removeAll(topics);
    this.scheduleSharedRebuild();
    this.stopDedicatedGroupsByTopics(topics);
  }

  public shutdownBeforeExit(): void {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    this.teardownAllConnections();
  }

  ngOnDestroy(): void {
    this.teardownAllConnections();
    this._status$.complete();
    this._diagnostics$.complete();
    this.incoming$.complete();
    this.destroy$.next();
    this.destroy$.complete();
    this.sharedRebuild$.complete();
  }

  // ───────────────── PRIVATE ─────────────────

  private buildIncomingStream$(topics: string[], options?: WatchConnectionOptions): Observable<IncomingMessage> {
    return this.shouldUseDedicatedConnection(options)
      ? this.subscribeViaDedicatedConnections$(topics)
      : this.subscribeViaSharedConnections$(topics);
  }

  private shouldUseDedicatedConnection(options?: WatchConnectionOptions): boolean {
    if (this.connectionMode === 'single') return true;
    return options?.newConnection === true;
  }

  private subscribeViaSharedConnections$(topics: string[]): Observable<IncomingMessage> {
    return defer(() => {
      this.topicsRegistry.addAll(topics);
      this.scheduleSharedRebuild();

      return this.incoming$.pipe(
        finalize(() => {
          this.topicsRegistry.removeAll(topics);
          this.scheduleSharedRebuild();
        })
      );
    });
  }

  private subscribeViaDedicatedConnections$(topics: string[]): Observable<IncomingMessage> {
    return defer(() => {
      if (!this.hubUrl) return EMPTY;

      const uniqueTopics = Array.from(new Set(topics));
      if (uniqueTopics.length === 0) return EMPTY;

      const groupId = `dedicated-${++this.sequence}`;
      const incoming = new Subject<IncomingMessage>();

      this.dedicatedGroups.set(groupId, new Set());
      this.dedicatedGroupTopics.set(groupId, new Set(uniqueTopics));

      try {
        const shards = this.buildTopicShards(uniqueTopics, {allowSplit: this.connectionMode === 'auto'});

        for (const shard of shards) {
          const shardSet = new Set(shard);
          const key = this.computeConnectionKey(shardSet, 'dedicated', groupId);
          const conn = this.openConnection({key, scope: 'dedicated', groupId, topics: shardSet, target: incoming});
          this.dedicatedGroups.get(groupId)?.add(conn.id);
        }
      } catch (err) {
        this.logger?.error?.('[Mercure] dedicated connection setup failed:', err);
        this.closeDedicatedGroup(groupId);
        incoming.complete();
        return EMPTY;
      }

      return incoming.asObservable().pipe(
        finalize(() => {
          this.closeDedicatedGroup(groupId);
          incoming.complete();
        })
      );
    });
  }

  private scheduleSharedRebuild(): void {
    if (this.shuttingDown) return;
    this.sharedRebuild$.next();
  }

  private rebuildSharedConnectionsOnce$(): Observable<void> {
    return defer(() => {
      if (this.shuttingDown) return of(void 0);

      try {
        if (!this.hubUrl || !this.topicsRegistry.hasAny()) {
          this.closeAllSharedConnections();
          return of(void 0);
        }

        const shards = this.buildTopicShards(this.topicsRegistry.snapshot(), {allowSplit: this.connectionMode === 'auto'});
        const desired = new Map<string, ReadonlySet<string>>();

        for (const shard of shards) {
          const topics = new Set(shard);
          const key = this.computeConnectionKey(topics, 'shared');
          desired.set(key, topics);
        }

        for (const [key, conn] of Array.from(this.sharedConnections.entries())) {
          if (!desired.has(key)) {
            this.closeConnection(conn.id);
          }
        }

        for (const [key, topics] of desired.entries()) {
          if (this.sharedConnections.has(key)) continue;
          const conn = this.openConnection({key, scope: 'shared', topics, target: this.incoming$});
          this.sharedConnections.set(key, conn);
        }
      } catch (err) {
        this.logger?.error?.('[Mercure] shared rebuild failed:', err);
      }

      return of(void 0);
    });
  }

  private openConnection(params: {
    key: string;
    scope: ManagedConnectionScope;
    topics: ReadonlySet<string>;
    target: Subject<IncomingMessage>;
    groupId?: string;
  }): ManagedConnection {
    if (!this.hubUrl) {
      throw new Error('Mercure hub URL is required to open a realtime connection.');
    }

    const id = `conn-${++this.sequence}`;
    const lastEventId = this.lastEventIdByKey.get(params.key);
    const url = this.urlBuilder.build(this.hubUrl, params.topics, lastEventId);

    this.logger?.debug?.('[Mercure] connect', {
      mode: this.connectionMode,
      scope: params.scope,
      key: params.key,
      urlLength: url.length,
      topics: Array.from(params.topics),
      lastEventId,
    });

    const wrapper = new EventSourceWrapper(url, {withCredentials: this.withCredentialsDefault}, this.logger);
    const stop$ = new Subject<void>();

    const conn: ManagedConnection = {
      id,
      key: params.key,
      scope: params.scope,
      groupId: params.groupId,
      topics: params.topics,
      urlLength: url.length,
      wrapper,
      stop$,
      status: 'connecting',
    };

    this.connections.set(conn.id, conn);

    wrapper.status$
      .pipe(takeUntil(stop$), takeUntil(this.destroy$))
      .subscribe((st) => {
        conn.status = st;
        this.updateGlobalStatus();
      });

    wrapper.events$
      .pipe(takeUntil(stop$), takeUntil(this.destroy$))
      .subscribe((e) => {
        const lastEventIdValue = e.lastEventId;
        if (typeof lastEventIdValue === 'string' && lastEventIdValue.length > 0) {
          this.lastEventIdByKey.set(params.key, lastEventIdValue);
        }
        params.target.next({type: e.type, data: e.data, lastEventId: e.lastEventId});
      });

    wrapper.open();
    this.updateGlobalStatus();

    return conn;
  }

  private closeAllSharedConnections(): void {
    for (const conn of Array.from(this.sharedConnections.values())) {
      this.closeConnection(conn.id);
    }
  }

  private stopDedicatedGroupsByTopics(topics: string[]): void {
    if (topics.length === 0) return;

    const toStop: string[] = [];
    for (const [groupId, groupTopics] of this.dedicatedGroupTopics.entries()) {
      const hasOverlap = topics.some((topic) => groupTopics.has(topic));
      if (hasOverlap) toStop.push(groupId);
    }

    for (const groupId of toStop) {
      this.closeDedicatedGroup(groupId);
    }
  }

  private closeDedicatedGroup(groupId: string): void {
    const connectionIds = this.dedicatedGroups.get(groupId);
    if (!connectionIds) return;

    for (const connectionId of Array.from(connectionIds)) {
      this.closeConnection(connectionId);
    }

    this.dedicatedGroups.delete(groupId);
    this.dedicatedGroupTopics.delete(groupId);
  }

  private closeConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    conn.status = 'closed';
    conn.wrapper.close();
    conn.stop$.next();
    conn.stop$.complete();

    this.connections.delete(connectionId);

    if (conn.scope === 'shared') {
      this.sharedConnections.delete(conn.key);
    }

    if (conn.scope === 'dedicated' && conn.groupId) {
      const groupConnections = this.dedicatedGroups.get(conn.groupId);
      groupConnections?.delete(conn.id);
      if (groupConnections && groupConnections.size === 0) {
        this.dedicatedGroups.delete(conn.groupId);
        this.dedicatedGroupTopics.delete(conn.groupId);
      }
    }

    this.updateGlobalStatus();
  }

  private teardownAllConnections(): void {
    for (const conn of Array.from(this.connections.values())) {
      this.closeConnection(conn.id);
    }

    this.sharedConnections.clear();
    this.dedicatedGroups.clear();
    this.dedicatedGroupTopics.clear();
    this.updateGlobalStatus();
  }

  private updateGlobalStatus(): void {
    if (this.connections.size === 0) {
      this._status$.next('closed');
      this.emitDiagnostics();
      return;
    }

    const statuses = Array.from(this.connections.values()).map((c) => c.status);
    if (statuses.includes('connected')) {
      this._status$.next('connected');
      this.emitDiagnostics();
      return;
    }

    if (statuses.includes('connecting')) {
      this._status$.next('connecting');
      this.emitDiagnostics();
      return;
    }

    this._status$.next('closed');
    this.emitDiagnostics();
  }

  private emitDiagnostics(): void {
    const connections = Array.from(this.connections.values())
      .map((conn) => ({
        id: conn.id,
        scope: conn.scope,
        status: conn.status,
        topicCount: conn.topics.size,
        topics: Array.from(conn.topics).sort(),
        urlLength: conn.urlLength,
      }))
      .sort((a, b) => {
        if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
        return a.id.localeCompare(b.id);
      });

    const sharedConnections = connections.filter((c) => c.scope === 'shared').length;
    const dedicatedConnections = connections.length - sharedConnections;

    this._diagnostics$.next({
      mode: this.connectionMode,
      maxUrlLength: this.maxUrlLength,
      totalConnections: connections.length,
      sharedConnections,
      dedicatedConnections,
      connections,
    });
  }

  private buildTopicShards(topics: Iterable<string>, opts: { allowSplit: boolean }): string[][] {
    const uniqueSortedTopics = Array.from(new Set(topics)).sort();
    if (uniqueSortedTopics.length === 0) return [];

    if (!opts.allowSplit || !this.hubUrl) {
      return [uniqueSortedTopics];
    }

    const shards: string[][] = [];
    let current: string[] = [];

    for (const topic of uniqueSortedTopics) {
      if (current.length === 0) {
        current = [topic];
        continue;
      }

      const candidate = [...current, topic];
      const urlLength = this.urlBuilder.build(this.hubUrl, new Set(candidate)).length;
      if (urlLength > this.maxUrlLength) {
        shards.push(current);
        current = [topic];
        continue;
      }

      current = candidate;
    }

    if (current.length > 0) {
      shards.push(current);
    }

    return shards;
  }

  private computeConnectionKey(topics: ReadonlySet<string>, scope: ManagedConnectionScope, groupId?: string): string {
    const topicsSorted = Array.from(topics).sort().join('|');
    const hub = this.hubUrl ?? '';
    const creds = this.withCredentialsDefault ? '1' : '0';
    const mode = this.connectionMode;
    const group = groupId ?? '';
    return `${scope}::${group}::${hub}::${creds}::${mode}::${topicsSorted}`;
  }

  private safeParse(raw: string): Item | undefined {
    try {
      return JSON.parse(raw) as Item;
    } catch {
      this.logger?.debug?.('[Mercure] invalid JSON payload ignored', {raw});
      return undefined;
    }
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

function normalizeMaxUrlLength(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value);
  return rounded >= 256 ? rounded : fallback;
}

function emptyDiagnostics(mode: MercureConnectionMode, maxUrlLength: number): RealtimeDiagnostics {
  return {
    mode,
    maxUrlLength,
    totalConnections: 0,
    sharedConnections: 0,
    dedicatedConnections: 0,
    connections: [],
  };
}
