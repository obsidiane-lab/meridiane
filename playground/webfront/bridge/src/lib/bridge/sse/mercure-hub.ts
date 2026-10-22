import {inject, Injectable, OnDestroy, PLATFORM_ID, signal} from '@angular/core';
import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, EMPTY, firstValueFrom, Observable, Subject} from 'rxjs';
import {distinctUntilChanged, filter, map} from 'rxjs/operators';
import {API_BASE_URL, BRIDGE_HTTP_WITH_CREDENTIALS, BRIDGE_LOGGER, BRIDGE_MERCURE} from '../../tokens';
import {RealtimeDiagnostics, RealtimeStatus} from '../../bridge.types';
import {
  MercureSubscription,
  MercureUpdate,
  RealtimePort,
  RealtimeSubscribeOptions,
} from '../../ports/realtime.port';
import {resolveUrl, toAbsoluteUrl} from '../../utils/url';
import {buildSubscribeUrl, subscriptionKey} from './mercure-url';

const RETRY_MIN_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 30_000;
/** Maximum number of `match*` parameters the reference hub accepts in one subscription request. */
const MAX_MATCHERS = 100;
const DEFAULT_MAX_URL_LENGTH = 4_000;
const SHARED_GROUP = 'shared';

/** One `EventSource` and the subscriptions it carries. */
type HubConnection = {
  /** Subscriptions only share connections of the same group. */
  group: string;
  /** `shared`, `dedicated` or the connection name, as exposed in the diagnostics. */
  label: string;
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

type GroupedUpdate = {
  group: string;
  update: MercureUpdate;
};

/**
 * Mercure connections of the whole application.
 *
 * Subscriptions are spread over as few connections as possible within their group (`shared` by default, a name,
 * or one connection per `dedicated` subscription): a connection takes subscriptions until its subscribe URL would
 * exceed `maxUrlLength` or 100 matchers. Mercure cannot change the subscriptions of an open stream, so a connection
 * is reopened when its own subscriptions change, with `last_event_id` set to its last received update to request
 * replay from the hub's retained history.
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
  private readonly updates = new Subject<GroupedUpdate>();
  private readonly diagnostics = new BehaviorSubject<RealtimeDiagnostics>(this.snapshot());
  private readonly statusSignal = signal<RealtimeStatus>('closed');

  readonly status = this.statusSignal.asReadonly();

  private authorization?: Promise<void>;
  private authorizing = false;
  private destroyed = false;
  private suspended = false;
  private dedicatedSequence = 0;
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

  subscribe$(subscription: MercureSubscription, options?: RealtimeSubscribeOptions): Observable<MercureUpdate> {
    if (!this.enabled || this.destroyed) {
      if (!this.hubUrl) this.logger?.debug?.('[Mercure] hubUrl not configured: realtime disabled');
      return EMPTY;
    }

    return new Observable<MercureUpdate>((subscriber) => {
      const {group, label} = this.groupOf(options?.connection);
      const updates = this.updates
        .pipe(
          filter((grouped) => grouped.group === group),
          map((grouped) => grouped.update)
        )
        .subscribe(subscriber);
      const key = this.retain(group, label, subscription);
      return () => {
        updates.unsubscribe();
        this.release(key);
      };
    });
  }

  reconnect(): void {
    if (!this.enabled || this.destroyed) return;
    void this.authorize(true).then(() => {
      if (this.destroyed || this.suspended) return;
      for (const connection of this.connections) {
        if (connection.subscriptions.size > 0) this.open(connection, this.subscribeUrl(connection.subscriptions));
      }
      this.publishDiagnostics();
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

  private groupOf(connection: RealtimeSubscribeOptions['connection'] = SHARED_GROUP): {group: string; label: string} {
    if (connection === 'dedicated') return {group: `dedicated:${++this.dedicatedSequence}`, label: connection};
    if (connection === SHARED_GROUP) return {group: SHARED_GROUP, label: connection};
    return {group: `named:${connection}`, label: connection};
  }

  /** Returns the key of the subscription, shared by its consumers within the group. */
  private retain(group: string, label: string, subscription: MercureSubscription): string {
    const key = `${group} ${subscriptionKey(subscription)}`;
    const active = this.subscriptions.get(key);
    if (active) {
      active.consumers++;
      this.publishDiagnostics();
      return key;
    }

    const connection = this.connectionFor(group, label, key, subscription);
    connection.subscriptions.set(key, subscription);
    this.subscriptions.set(key, {subscription, consumers: 1, connection});
    this.scheduleSync();
    return key;
  }

  private release(key: string): void {
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

  /** First connection of the group that stays within the limits with this subscription, or a new connection. */
  private connectionFor(group: string, label: string, key: string, subscription: MercureSubscription): HubConnection {
    const fitting = this.connections.find((connection) => {
      if (connection.group !== group || connection.subscriptions.size >= MAX_MATCHERS) return false;
      const subscriptions = new Map(connection.subscriptions).set(key, subscription);
      return this.subscribeUrl(subscriptions).length <= this.maxUrlLength;
    });
    if (fitting) return fitting;

    const connection: HubConnection = {group, label, subscriptions: new Map(), status: 'closed', failures: 0};
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
      this.updates.next({group: connection.group, update: {id: event.lastEventId || undefined, data}});
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
    const diagnostics = this.snapshot();
    this.statusSignal.set(diagnostics.status);
    this.diagnostics.next(diagnostics);
  }

  private snapshot(): RealtimeDiagnostics {
    return {
      status: aggregateStatus(this.connections.map((connection) => connection.status)),
      connections: this.connections.map((connection) => ({
        connection: connection.label,
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
