import {inject, Injectable, OnDestroy, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {BehaviorSubject, EMPTY, Observable, Subject} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import {BRIDGE_LOGGER, BRIDGE_MERCURE_WITH_CREDENTIALS, MERCURE_HUB_URL} from '../../tokens';
import {RealtimeDiagnostics, RealtimeStatus} from '../../bridge.types';
import {MercureSubscription, MercureUpdate, RealtimePort} from '../../ports/realtime.port';
import {buildSubscribeUrl, subscriptionKey} from './mercure-url';

type ActiveSubscription = {
  subscription: MercureSubscription;
  consumers: number;
};

const RETRY_MIN_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 30_000;

/**
 * Single Mercure connection shared by the whole application.
 *
 * Its subscriptions are the union of the active `watch$()` streams. Mercure cannot change the
 * subscriptions of an open stream, so the connection is reopened when that union changes, with
 * `last_event_id` set to the last received update to request replay from the hub's retained history.
 */
@Injectable({providedIn: 'root'})
export class MercureHub implements RealtimePort, OnDestroy {
  private readonly hubUrl = inject(MERCURE_HUB_URL, {optional: true}) ?? undefined;
  private readonly withCredentials = inject(BRIDGE_MERCURE_WITH_CREDENTIALS);
  private readonly logger = inject(BRIDGE_LOGGER, {optional: true}) ?? undefined;
  private readonly enabled = !!this.hubUrl && isPlatformBrowser(inject(PLATFORM_ID));

  private readonly subscriptions = new Map<string, ActiveSubscription>();
  private readonly updates = new Subject<MercureUpdate>();
  private readonly diagnostics: BehaviorSubject<RealtimeDiagnostics>;

  private source?: EventSource;
  private sourceUrl?: string;
  private status: RealtimeStatus = 'closed';
  private lastEventId?: string;
  private failures = 0;
  private destroyed = false;
  private suspended = false;
  private syncTimer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;

  private readonly onPageHide = (event: PageTransitionEvent) => {
    // Free the connection, and let the page enter the back/forward cache.
    if (event.persisted) {
      this.suspended = true;
      clearTimeout(this.syncTimer);
      this.disconnect();
    }
  };
  private readonly onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      this.suspended = false;
      this.scheduleSync();
    }
  };

  constructor() {
    this.diagnostics = new BehaviorSubject(this.snapshot());
    if (this.enabled) {
      window.addEventListener('pagehide', this.onPageHide);
      window.addEventListener('pageshow', this.onPageShow);
    }
  }

  subscribe$(subscription: MercureSubscription): Observable<MercureUpdate> {
    if (!this.enabled || this.destroyed) {
      if (!this.hubUrl) this.logger?.debug?.('[Mercure] hubUrl not configured: realtime disabled');
      return EMPTY;
    }

    return new Observable<MercureUpdate>((subscriber) => {
      const updates = this.updates.subscribe(subscriber);
      this.retain(subscription);
      return () => {
        updates.unsubscribe();
        this.release(subscription);
      };
    });
  }

  status$(): Observable<RealtimeStatus> {
    return this.diagnostics.pipe(map((diagnostics) => diagnostics.status), distinctUntilChanged());
  }

  diagnostics$(): Observable<RealtimeDiagnostics> {
    return this.diagnostics.asObservable();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.syncTimer);
    this.subscriptions.clear();
    this.disconnect();
    if (this.enabled) {
      window.removeEventListener('pagehide', this.onPageHide);
      window.removeEventListener('pageshow', this.onPageShow);
    }
    this.updates.complete();
    this.diagnostics.complete();
  }

  private retain(subscription: MercureSubscription): void {
    const key = subscriptionKey(subscription);
    const active = this.subscriptions.get(key);
    if (active) {
      active.consumers++;
      this.publishDiagnostics();
      return;
    }

    this.subscriptions.set(key, {subscription, consumers: 1});
    this.scheduleSync();
  }

  private release(subscription: MercureSubscription): void {
    const key = subscriptionKey(subscription);
    const active = this.subscriptions.get(key);
    if (!active) return;

    if (--active.consumers > 0) {
      this.publishDiagnostics();
      return;
    }

    this.subscriptions.delete(key);
    this.scheduleSync();
  }

  /** Coalesces the subscription changes of the current task (e.g. a route change) into one reconnection. */
  private scheduleSync(): void {
    if (this.destroyed || this.suspended) return;
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.sync());
  }

  private sync(): void {
    if (this.destroyed || this.suspended) return;
    if (this.subscriptions.size === 0) {
      this.disconnect();
      return;
    }

    const url = this.subscribeUrl();
    if (this.source && url === this.sourceUrl) return;
    this.connect(url);
  }

  private connect(url: string): void {
    this.closeSource();

    const resumeUrl = this.subscribeUrl(this.lastEventId);
    this.logger?.debug?.('[Mercure] connect', {url: resumeUrl});

    const source = new EventSource(resumeUrl, {withCredentials: this.withCredentials});
    this.source = source;
    this.sourceUrl = url;
    this.setStatus('connecting');

    source.onopen = () => {
      if (this.source !== source) return;
      this.failures = 0;
      this.setStatus('connected');
    };

    source.onmessage = (event) => {
      if (this.source !== source) return;
      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
        this.publishDiagnostics();
      }
      const data = parseJson(event.data);
      if (data === undefined) {
        this.logger?.debug?.('[Mercure] non-JSON update ignored', {id: event.lastEventId});
        return;
      }
      this.updates.next({id: event.lastEventId || undefined, data});
    };

    source.onerror = () => {
      if (this.source !== source) return;
      if (source.readyState !== EventSource.CLOSED) {
        // Network interruption: the browser reconnects by itself and sends `Last-Event-ID`.
        this.setStatus('connecting');
        return;
      }

      // The hub refused the request (401 / 403 / 400...): EventSource gives up, so retry with backoff.
      this.failures++;
      this.closeSource();
      this.setStatus('connecting');
      const delay = Math.min(RETRY_MIN_DELAY_MS * 2 ** (this.failures - 1), RETRY_MAX_DELAY_MS);
      this.logger?.warn?.('[Mercure] subscription refused by the hub, retrying', {delay, failures: this.failures});
      this.retryTimer = setTimeout(() => this.sync(), delay);
    };
  }

  private disconnect(): void {
    this.closeSource();
    this.setStatus('closed');
  }

  private closeSource(): void {
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    if (!this.source) return;

    this.source.onopen = null;
    this.source.onmessage = null;
    this.source.onerror = null;
    this.source.close();
    this.source = undefined;
    this.sourceUrl = undefined;
    this.logger?.debug?.('[Mercure] closed');
  }

  private subscribeUrl(lastEventId?: string): string {
    const subscriptions = [...this.subscriptions.values()]
      .map((active) => active.subscription)
      .sort((left, right) => subscriptionKey(left).localeCompare(subscriptionKey(right)));
    return buildSubscribeUrl(this.hubUrl!, subscriptions, lastEventId);
  }

  private setStatus(status: RealtimeStatus): void {
    this.status = status;
    this.publishDiagnostics();
  }

  private publishDiagnostics(): void {
    this.diagnostics?.next(this.snapshot());
  }

  private snapshot(): RealtimeDiagnostics {
    return {
      status: this.status,
      url: this.sourceUrl,
      subscriptions: [...this.subscriptions.values()].map(({subscription, consumers}) => ({
        match: subscription.match,
        type: subscription.type,
        consumers,
      })),
      lastEventId: this.lastEventId,
      failures: this.failures,
    };
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
