import {DOCUMENT, Inject, Injectable, OnDestroy, PLATFORM_ID} from '@angular/core';
import {BehaviorSubject, Subject, Observable, defer, of, fromEvent} from 'rxjs';
import {auditTime, concatMap, filter, finalize, first, map, share, takeUntil} from 'rxjs/operators';
import {API_BASE_URL, MERCURE_CONFIG, MERCURE_HUB_URL} from '../../tokens';
import {RealtimePort, RealtimeEvent, RealtimeStatus} from '../../ports/realtime.port';
import {EventSourceWrapper} from './eventsource-wrapper';
import {Item} from "../../ports/resource-repository.port";
import {isPlatformBrowser} from '@angular/common';
import {MercureUrlBuilder} from './mercure-url.builder';
import {RefCountTopicRegistry} from './ref-count-topic.registry';

class CredentialsPolicy {
  constructor(private readonly init: unknown) {
  }

  withCredentials(): boolean {
    const c = this.init as any;
    return c?.withCredentials === true || c?.credentials === 'include';
  }
}

@Injectable({providedIn: 'root'})
export class MercureRealtimeAdapter<T> implements RealtimePort<T>, OnDestroy {
  private lastEventId?: string;
  private es?: EventSourceWrapper;
  private currentKey?: string;

  private readonly topicsRegistry = new RefCountTopicRegistry();
  private readonly urlBuilder: MercureUrlBuilder;
  private readonly credentialsPolicy: CredentialsPolicy;

  private readonly destroy$ = new Subject<void>();
  private connectionStop$ = new Subject<void>();
  private readonly rebuild$ = new Subject<void>();
  private shuttingDown = false;

  private readonly _status$ = new BehaviorSubject<RealtimeStatus>('closed');
  private readonly incoming$ = new Subject<{ type: string; data: string }>();

  constructor(
    @Inject(API_BASE_URL) private readonly apiBase: string,
    @Inject(MERCURE_CONFIG) private readonly init: string,
    @Inject(MERCURE_HUB_URL) private readonly hubUrl: string,
    @Inject(DOCUMENT) private readonly doc: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {
    this.urlBuilder = new MercureUrlBuilder(apiBase);
    this.credentialsPolicy = new CredentialsPolicy(init);

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


  subscribe$(iris: string[]): Observable<RealtimeEvent<T>> {
    if (!iris || iris.length === 0) {
      return new Observable<RealtimeEvent<T>>((sub) => sub.complete());
    }

    this.topicsRegistry.addAll(iris);
    this.scheduleRebuild();

    const filterSet = new Set(iris);

    return this.incoming$.pipe(
      map((evt) => this.safeParse(evt.data)),
      filter((payload: Item) => !!payload && !!payload['@id'] && filterSet.has(payload['@id'] as string)),
      map((payload) => ({iri: payload['@id'] as string, data: payload as T})),
      finalize(() => {
        this.topicsRegistry.removeAll(iris);
        this.scheduleRebuild();
      }),
      share()
    );
  }

  unsubscribe(iris: string[]): void {
    if (!iris || iris.length === 0) return;
    this.topicsRegistry.removeAll(iris);
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
        const hasTopics = this.topicsRegistry.hasAny();
        const key = hasTopics ? this.topicsRegistry.computeKey(this.hubUrl, this.credentialsPolicy.withCredentials()) : undefined;

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
        this.es = new EventSourceWrapper(url, {withCredentials: this.credentialsPolicy.withCredentials()});

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
        this.currentKey = key; // Mémorise la config effective
      } catch (err) {
        console.error('[Mercure] rebuild failed:', err);
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

  private safeParse(raw: string): Item {
    return JSON.parse(raw) as Item;
  }
}
