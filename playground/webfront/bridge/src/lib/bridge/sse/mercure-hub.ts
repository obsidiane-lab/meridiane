import {inject, Injectable, OnDestroy, PLATFORM_ID} from '@angular/core';
import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, EMPTY, firstValueFrom, Observable, Subject} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import {API_BASE_URL, BRIDGE_HTTP_WITH_CREDENTIALS, BRIDGE_LOGGER, BRIDGE_MERCURE} from '../../tokens';
import {RealtimeDiagnostics, RealtimeStatus} from '../../bridge.types';
import {MercureSubscription, MercureUpdate, RealtimePort} from '../../ports/realtime.port';
import {toAbsoluteUrl} from '../../utils/absolute-url';
import {resolveUrl} from '../../utils/url';
import {buildSubscribeUrl, subscriptionKey} from './mercure-url';

const RETRY_MIN_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 30_000;
/** Maximum number of `match*` parameters the reference hub accepts in one subscription request. */
const MAX_MATCHERS = 100;
const DEFAULT_MAX_URL_LENGTH = 4_000;

/** One `EventSource` and the subscriptions it carries. */
type HubConnection = {
  subscriptions: Map<string, MercureSubscription>;
  source?: EventSource;
  /** Subscribe URL of the open source (without `last_event_id`). */
  url?: string;
  status: RealtimeStatus;
  lastEventId?: string;
  failures: number;
  retryTimer?: ReturnType<typeof setTimeout>;
};

type ActiveSubscription = {
  subscription: MercureSubscription;
  consumers: number;
  connection: HubConnection;
};

/**
 * Mercure connections shared by the whole application.
 *
 * Active `watch$()` subscriptions are spread over as few connections as possible: a connection takes
 * subscriptions until its subscribe URL would exceed `maxUrlLength` or 100 matchers. Mercure cannot change
 * the subscriptions of an open stream, so a connection is reopened when its own subscriptions change, with
 * `last_event_id` set to its last received update to request replay from the hub's retained history.
 */
@Injectable({providedIn: 'root'})
export class MercureHub implements RealtimePort, OnDestroy {
  private readonly options = inject(BRIDGE_MERCURE, {optional: true}) ?? undefined;
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly httpWithCredentials = inject(BRIDGE_HTTP_WITH_CREDENTIALS);
  private readonly logger = inject(BRIDGE_LOGGER, {optional: true}) ?? undefined;
  private readonly hubUrl = this.options
    ? toAbsoluteUrl(this.options.hubUrl, toAbsoluteUrl(this.apiBaseUrl, inject(DOCUMENT).baseURI))
    : undefined;
  private readonly withCredentials = this.options?.withCredentials ?? true;
  private readonly maxUrlLength = this.options?.maxUrlLength ?? DEFAULT_MAX_URL_LENGTH;
  private readonly enabled = !!this.hubUrl && isPlatformBrowser(inject(PLATFORM_ID));

  private readonly subscriptions = new Map<string, ActiveSubscription>();
  private readonly connections: HubConnection[] = [];
  private readonly updates = new Subject<MercureUpdate>();
  private readonly diagnostics = new BehaviorSubject<RealtimeDiagnostics>(this.snapshot());

  private authorization?: Promise<void>;
  private authorizing = false;
  private destroyed = false;
  private suspended = false;
  private syncTimer?: ReturnType<typeof setTimeout>;

  private readonly onPageHide = (event: PageTransitionEvent) => {
    // Free the connections, and let the page enter the back/forward cache.
    if (!event.persisted) return;
    this.suspended = true;
    clearTimeout(this.syncTimer);
    for (const connection of this.connections) {
      this.closeSource(connection);
      connection.status = 'closed';
    }
    this.publishDiagnostics();
  };
  private readonly onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    this.suspended = false;
    this.scheduleSync();
  };

  constructor() {
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
    for (const connection of this.connections) this.closeSource(connection);
    this.connections.length = 0;
    this.subscriptions.clear();
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

    const connection = this.connectionFor(key, subscription);
    connection.subscriptions.set(key, subscription);
    this.subscriptions.set(key, {subscription, consumers: 1, connection});
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
    active.connection.subscriptions.delete(key);
    this.scheduleSync();
  }

  /** First connection that stays within the limits with this subscription, or a new connection. */
  private connectionFor(key: string, subscription: MercureSubscription): HubConnection {
    const fitting = this.connections.find((connection) => {
      if (connection.subscriptions.size >= MAX_MATCHERS) return false;
      const subscriptions = new Map(connection.subscriptions).set(key, subscription);
      return this.subscribeUrl(subscriptions).length <= this.maxUrlLength;
    });
    if (fitting) return fitting;

    const connection: HubConnection = {subscriptions: new Map(), status: 'closed', failures: 0};
    this.connections.push(connection);
    return connection;
  }

  /** Coalesces the subscription changes of the current task (e.g. a route change) into one reconciliation. */
  private scheduleSync(): void {
    if (this.destroyed || this.suspended) return;
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => void this.sync());
  }

  private async sync(): Promise<void> {
    await this.authorize();
    if (this.destroyed || this.suspended) return;

    for (const connection of [...this.connections]) {
      if (connection.subscriptions.size === 0) {
        this.remove(connection);
        continue;
      }
      // A refused connection is reopened by its retry, with its subscriptions at that time.
      if (connection.retryTimer) continue;

      const url = this.subscribeUrl(connection.subscriptions);
      if (connection.source && url === connection.url) continue;
      this.open(connection, url);
    }
    this.publishDiagnostics();
  }

  private open(connection: HubConnection, url: string): void {
    this.closeSource(connection);
    if (url.length > this.maxUrlLength) {
      this.logger?.warn?.('[Mercure] a single subscription exceeds maxUrlLength', {url});
    }

    const resumeUrl = this.subscribeUrl(connection.subscriptions, connection.lastEventId);
    this.logger?.debug?.('[Mercure] connect', {url: resumeUrl});

    const source = new EventSource(resumeUrl, {withCredentials: this.withCredentials});
    connection.source = source;
    connection.url = url;
    connection.status = 'connecting';

    source.onopen = () => {
      if (connection.source !== source) return;
      connection.failures = 0;
      connection.status = 'connected';
      this.publishDiagnostics();
    };

    source.onmessage = (event) => {
      if (connection.source !== source) return;
      if (event.lastEventId) {
        connection.lastEventId = event.lastEventId;
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
      if (connection.source !== source) return;
      if (source.readyState !== EventSource.CLOSED) {
        // Network interruption: the browser reconnects by itself and sends `Last-Event-ID`.
        connection.status = 'connecting';
        this.publishDiagnostics();
        return;
      }

      // The hub refused the request (401 / 403 / 429 / 400...): EventSource gives up.
      // Renew the authorization (e.g. expired token), then reopen with backoff.
      connection.failures++;
      this.closeSource(connection);
      connection.status = 'connecting';
      const delay = Math.min(RETRY_MIN_DELAY_MS * 2 ** (connection.failures - 1), RETRY_MAX_DELAY_MS);
      this.logger?.warn?.('[Mercure] subscription refused by the hub, retrying', {delay, failures: connection.failures});
      connection.retryTimer = setTimeout(() => void this.retry(connection), delay);
      this.publishDiagnostics();
    };
  }

  private async retry(connection: HubConnection): Promise<void> {
    await this.authorize(true);
    connection.retryTimer = undefined;
    if (this.destroyed || this.suspended || !this.connections.includes(connection)) return;

    if (connection.subscriptions.size === 0) this.remove(connection);
    else this.open(connection, this.subscribeUrl(connection.subscriptions));
    this.publishDiagnostics();
  }

  /** Obtains the authorization cookie once, or again with `renew` (deduplicated while a request is in flight). */
  private authorize(renew = false): Promise<void> {
    const authorize = this.options?.authorize;
    if (!authorize) return Promise.resolve();
    if (this.authorization && (!renew || this.authorizing)) return this.authorization;

    this.authorizing = true;
    const request = typeof authorize === 'function'
      ? authorize()
      : firstValueFrom(
        this.http.get(resolveUrl(this.apiBaseUrl, authorize), {withCredentials: this.httpWithCredentials}),
        {defaultValue: undefined}
      );
    this.authorization = request
      .then(
        () => undefined,
        (error: unknown) => this.logger?.warn?.('[Mercure] authorization failed', error)
      )
      .finally(() => {
        this.authorizing = false;
      });
    return this.authorization;
  }

  private remove(connection: HubConnection): void {
    this.closeSource(connection);
    this.connections.splice(this.connections.indexOf(connection), 1);
  }

  private closeSource(connection: HubConnection): void {
    clearTimeout(connection.retryTimer);
    connection.retryTimer = undefined;
    if (!connection.source) return;

    connection.source.onopen = null;
    connection.source.onmessage = null;
    connection.source.onerror = null;
    connection.source.close();
    connection.source = undefined;
    connection.url = undefined;
    this.logger?.debug?.('[Mercure] closed');
  }

  private subscribeUrl(subscriptions: Map<string, MercureSubscription>, lastEventId?: string): string {
    const sorted = [...subscriptions.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, subscription]) => subscription);
    return buildSubscribeUrl(this.hubUrl!, sorted, lastEventId);
  }

  private publishDiagnostics(): void {
    this.diagnostics.next(this.snapshot());
  }

  private snapshot(): RealtimeDiagnostics {
    return {
      status: aggregateStatus(this.connections.map((connection) => connection.status)),
      connections: this.connections.map((connection) => ({
        status: connection.status,
        url: connection.url,
        subscriptions: [...connection.subscriptions.entries()].map(([key, subscription]) => ({
          match: subscription.match,
          type: subscription.type,
          consumers: this.subscriptions.get(key)?.consumers ?? 0,
        })),
        lastEventId: connection.lastEventId,
        failures: connection.failures,
      })),
    };
  }
}

function aggregateStatus(statuses: RealtimeStatus[]): RealtimeStatus {
  if (statuses.every((status) => status === 'closed')) return 'closed';
  if (statuses.every((status) => status === 'connected')) return 'connected';
  return 'connecting';
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
