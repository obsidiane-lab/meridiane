import {inject, Injectable, OnDestroy, PLATFORM_ID} from '@angular/core';
import {defer, EMPTY, fromEvent, Observable, Subject} from 'rxjs';
import {auditTime, filter, finalize, map, takeUntil} from 'rxjs/operators';
import {
  API_BASE_URL,
  BRIDGE_LOGGER,
  BRIDGE_MERCURE_WITH_CREDENTIALS,
  MERCURE_CONNECTION_MODE,
  MERCURE_HUB_URL,
  MERCURE_MAX_URL_LENGTH,
  MERCURE_TOPIC_MODE,
} from '../../tokens';
import {
  RealtimeDiagnostics,
  WatchConnectionOptions,
} from '../../bridge.types';
import {RealtimeDiagnosticsPort, RealtimeEvent, RealtimeStatus, SubscribeFilter} from '../../ports/realtime.port';
import {Iri, Item} from '../../ports/resource-repository.port';
import {isPlatformBrowser} from '@angular/common';
import {RefCountTopicRegistry} from './ref-count-topic.registry';
import {MercureTopicMapper} from './mercure-topic.mapper';
import {SubscriptionClaims, topicsKey} from './subscription-claims';
import {createPayloadTopicMatcher, parseMercurePayload} from './mercure-payload';
import {toIriList} from '../../utils/iri';
import {IncomingMessage, MercureConnectionManager} from './mercure-connections';

type SharedSubscriptionClaim = {
  id: string;
  topics: string[];
  topicsKey: string;
  stop$: Subject<void>;
};

type DedicatedSubscriptionClaim = {
  id: string;
  groupId: string;
  topics: string[];
  topicsKey: string;
  incoming: Subject<IncomingMessage>;
  stop$: Subject<void>;
};

type PreparedSubscription = {
  iris: string[];
  source$: Observable<IncomingMessage>;
};

@Injectable({providedIn: 'root'})
export class MercureRealtimeAdapter implements RealtimeDiagnosticsPort, OnDestroy {
  private readonly apiBase = inject(API_BASE_URL);
  private readonly withCredentials = inject(BRIDGE_MERCURE_WITH_CREDENTIALS);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly hubUrl = inject(MERCURE_HUB_URL, {optional: true}) ?? undefined;
  private readonly topicMode = inject(MERCURE_TOPIC_MODE, {optional: true}) ?? 'url';
  private readonly connectionMode = inject(MERCURE_CONNECTION_MODE, {optional: true}) ?? 'auto';
  private readonly maxUrlLength = normalizeMaxUrlLength(
    inject(MERCURE_MAX_URL_LENGTH, {optional: true}),
    1900
  );
  private readonly logger = inject(BRIDGE_LOGGER, {optional: true}) ?? undefined;

  private readonly destroy$ = new Subject<void>();
  private readonly sharedRebuild$ = new Subject<void>();
  private readonly incoming$ = new Subject<IncomingMessage>();
  private shuttingDown = false;
  private sequence = 0;

  private readonly topicsRegistry = new RefCountTopicRegistry();
  private readonly topicMapper = new MercureTopicMapper(this.apiBase, this.topicMode);
  private readonly connectionManager = new MercureConnectionManager({
    hubUrl: this.hubUrl,
    withCredentials: this.withCredentials,
    mode: this.connectionMode,
    maxUrlLength: this.maxUrlLength,
    logger: this.logger,
    destroy$: this.destroy$,
    nextId: (prefix) => `${prefix}-${++this.sequence}`,
  });
  private readonly sharedClaims = new SubscriptionClaims<SharedSubscriptionClaim>();
  private readonly dedicatedClaims = new SubscriptionClaims<DedicatedSubscriptionClaim>();

  constructor() {
    this.sharedRebuild$.pipe(auditTime(10)).subscribe(() => this.rebuildSharedConnections());

    if (isPlatformBrowser(this.platformId)) {
      fromEvent<PageTransitionEvent>(window, 'pagehide')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.shutdownBeforeExit());

      fromEvent<BeforeUnloadEvent>(window, 'beforeunload')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.shutdownBeforeExit());
    }
  }

  status$(): Observable<RealtimeStatus> {
    return this.connectionManager.status$;
  }

  diagnostics$(): Observable<RealtimeDiagnostics> {
    return this.connectionManager.diagnostics$;
  }

  subscribe$<T>(
    iris: Iri[],
    subscribeFilter?: SubscribeFilter,
    options?: WatchConnectionOptions
  ): Observable<RealtimeEvent<T>> {
    return defer(() => {
      const subscription = this.prepareSubscription(iris, options);
      if (!subscription) return EMPTY;

      const matchTopic = createPayloadTopicMatcher(
        subscription.iris,
        subscribeFilter,
        this.topicMapper
      );

      return this.payloads$(subscription.source$).pipe(
        map((payload) => {
          const topic = matchTopic(payload);
          if (!topic) return undefined;

          const rawId = payload?.['@id'];
          const iri = typeof rawId === 'string' ? rawId : topic;
          return {topic, iri, data: payload as T} as RealtimeEvent<T>;
        }),
        filter((event): event is RealtimeEvent<T> => event !== undefined)
      );
    });
  }

  subscribeAll$<T>(iris: Iri[], options?: WatchConnectionOptions): Observable<RealtimeEvent<T>> {
    return defer(() => {
      const subscription = this.prepareSubscription(iris, options);
      if (!subscription) return EMPTY;

      return this.payloads$(subscription.source$).pipe(
        map((payload) => {
          const rawId = payload['@id'];
          const iri = typeof rawId === 'string' ? rawId : '';
          return {iri, data: payload as T} as RealtimeEvent<T>;
        })
      );
    });
  }

  unsubscribe(iris: Iri[]): void {
    const inputIris = toIriList(iris);
    if (inputIris.length === 0) return;

    const topics = uniqueStrings(inputIris.map((iri) => this.topicMapper.toTopic(iri)));
    if (this.releaseOneClaimByTopics(topics)) return;

    // Claims are the source of truth. Never drop shared topics blindly when claims still exist:
    // it could disconnect another active consumer.
    if (this.sharedClaims.size === 0 && this.dedicatedClaims.size === 0) {
      this.topicsRegistry.removeAll(topics);
      this.scheduleSharedRebuild();
      return;
    }

    this.logger?.warn?.('[Mercure] unsubscribe ignored: no matching active claim for topics', {topics});
  }

  shutdownBeforeExit(): void {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    this.teardownAllConnections();
  }

  ngOnDestroy(): void {
    this.teardownAllConnections();
    this.connectionManager.complete();
    this.incoming$.complete();
    this.destroy$.next();
    this.destroy$.complete();
    this.sharedRebuild$.complete();
  }

  private prepareSubscription(
    iris: Iri[],
    options?: WatchConnectionOptions
  ): PreparedSubscription | undefined {
    const inputIris = toIriList(iris);
    if (inputIris.length === 0) return undefined;

    if (!this.hubUrl) {
      this.logger?.debug?.('[Mercure] hubUrl not configured → realtime disabled');
      return undefined;
    }

    const topics = uniqueStrings(inputIris.map((iri) => this.topicMapper.toTopic(iri)));
    return {
      iris: inputIris,
      source$: this.buildIncomingStream$(topics, options),
    };
  }

  private payloads$(source$: Observable<IncomingMessage>): Observable<Item> {
    return source$.pipe(
      map((event) => parseMercurePayload(event.data, this.logger)),
      filter((payload): payload is Item => payload !== undefined)
    );
  }

  private buildIncomingStream$(topics: string[], options?: WatchConnectionOptions): Observable<IncomingMessage> {
    const useDedicatedConnection = this.connectionMode === 'single' || options?.newConnection === true;
    return useDedicatedConnection
      ? this.subscribeViaDedicatedConnections$(topics)
      : this.subscribeViaSharedConnections$(topics);
  }

  private subscribeViaSharedConnections$(topics: string[]): Observable<IncomingMessage> {
    return defer(() => {
      const uniqueTopics = uniqueStrings(topics);
      if (uniqueTopics.length === 0) return EMPTY;
      const claim = this.createSharedClaim(uniqueTopics);

      return this.incoming$.pipe(
        takeUntil(claim.stop$),
        finalize(() => {
          this.releaseSharedClaim(claim.id);
        })
      );
    });
  }

  private subscribeViaDedicatedConnections$(topics: string[]): Observable<IncomingMessage> {
    return defer(() => {
      if (!this.hubUrl) return EMPTY;

      const uniqueTopics = uniqueStrings(topics);
      if (uniqueTopics.length === 0) return EMPTY;

      const groupId = `dedicated-${++this.sequence}`;
      const incoming = new Subject<IncomingMessage>();
      const claim = this.createDedicatedClaim({groupId, topics: uniqueTopics, incoming});

      try {
        this.connectionManager.openDedicated(groupId, uniqueTopics, incoming);
      } catch (error) {
        this.logger?.error?.('[Mercure] dedicated connection setup failed:', error);
        this.releaseDedicatedClaim(claim.id);
        return EMPTY;
      }

      return incoming.asObservable().pipe(
        takeUntil(claim.stop$),
        finalize(() => {
          this.releaseDedicatedClaim(claim.id);
        })
      );
    });
  }

  private scheduleSharedRebuild(): void {
    if (this.shuttingDown) return;
    this.sharedRebuild$.next();
  }

  private rebuildSharedConnections(): void {
    if (this.shuttingDown) return;

    try {
      if (!this.hubUrl || !this.topicsRegistry.hasAny()) {
        this.connectionManager.closeShared();
        return;
      }

      this.connectionManager.reconcileShared(this.topicsRegistry.snapshot(), this.incoming$);
    } catch (error) {
      this.logger?.error?.('[Mercure] shared rebuild failed:', error);
    }
  }

  private createSharedClaim(topics: string[]): SharedSubscriptionClaim {
    const normalizedTopics = uniqueStrings(topics);
    const claim: SharedSubscriptionClaim = {
      id: `shared-claim-${++this.sequence}`,
      topics: normalizedTopics,
      topicsKey: topicsKey(normalizedTopics),
      stop$: new Subject<void>(),
    };

    this.sharedClaims.add(claim);
    this.topicsRegistry.addAll(claim.topics);
    this.scheduleSharedRebuild();

    return claim;
  }

  private createDedicatedClaim(params: {
    groupId: string;
    topics: string[];
    incoming: Subject<IncomingMessage>;
  }): DedicatedSubscriptionClaim {
    const normalizedTopics = uniqueStrings(params.topics);
    const claim: DedicatedSubscriptionClaim = {
      id: `dedicated-claim-${++this.sequence}`,
      groupId: params.groupId,
      topics: normalizedTopics,
      topicsKey: topicsKey(normalizedTopics),
      incoming: params.incoming,
      stop$: new Subject<void>(),
    };

    this.dedicatedClaims.add(claim);
    return claim;
  }

  private releaseOneClaimByTopics(topics: string[]): boolean {
    const key = topicsKey(topics);
    if (!key) return false;

    if (this.connectionMode === 'single') {
      return this.dedicatedClaims.stopNext(key) || this.sharedClaims.stopNext(key);
    }

    return this.sharedClaims.stopNext(key) || this.dedicatedClaims.stopNext(key);
  }

  private releaseSharedClaim(claimId: string): void {
    const claim = this.sharedClaims.release(claimId);
    if (!claim) return;

    this.topicsRegistry.removeAll(claim.topics);
    this.scheduleSharedRebuild();
  }

  private releaseDedicatedClaim(claimId: string): void {
    const claim = this.dedicatedClaims.release(claimId);
    if (!claim) return;

    this.connectionManager.closeDedicated(claim.groupId);
    claim.incoming.complete();
  }

  private teardownAllConnections(): void {
    this.shuttingDown = true;
    this.sharedClaims.stopAll();
    this.dedicatedClaims.stopAll();

    this.sharedClaims.clear();
    this.dedicatedClaims.clear();
    this.connectionManager.closeAll();
  }
}

function normalizeMaxUrlLength(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value);
  return rounded >= 256 ? rounded : fallback;
}

function uniqueStrings(values: Iterable<string>): string[] {
  return [...new Set(values)];
}
