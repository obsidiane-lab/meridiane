import {Signal} from '@angular/core';
import {Observable} from 'rxjs';
import {RealtimeDiagnostics, RealtimeStatus} from '../bridge.types';

/**
 * A Mercure 1.0 subscription, sent to the hub as `match=` (exact) or `match_urlpattern=` (WHATWG URL Pattern).
 */
export interface MercureSubscription {
  /** Absolute topic, or absolute URL Pattern when `type` is `urlpattern` (e.g. `https://api.example.com/api/books/:id`). */
  match: string;
  type: 'exact' | 'urlpattern';
}

/**
 * Connection carrying a subscription:
 * - `shared`: connections shared by the application, split automatically when too long;
 * - `dedicated`: a connection for this subscription only;
 * - any other value: connections shared by the subscriptions using this name.
 */
export type RealtimeConnection = 'shared' | 'dedicated' | (string & {});

export interface RealtimeSubscribeOptions {
  connection?: RealtimeConnection;
}

/** A Mercure update received on the SSE connection. */
export interface MercureUpdate {
  /** Update ID assigned by the hub (SSE `id`). */
  id?: string;
  /** Parsed JSON payload. */
  data: unknown;
}

export interface RealtimePort {
  /** State of the connections. */
  readonly status: Signal<RealtimeStatus>;

  /**
   * Registers a subscription for as long as the returned Observable is subscribed. Default connection: `shared`.
   *
   * Mercure does not tell which subscription matched an update: the stream emits every update received on the
   * connections carrying the subscription, and consumers keep the ones that concern them (e.g. by `@id`).
   */
  subscribe$(subscription: MercureSubscription, options?: RealtimeSubscribeOptions): Observable<MercureUpdate>;

  /** Renews the authorization and reopens every connection, e.g. after login or logout. */
  reconnect(): void;

  status$(): Observable<RealtimeStatus>;

  diagnostics$(): Observable<RealtimeDiagnostics>;
}
