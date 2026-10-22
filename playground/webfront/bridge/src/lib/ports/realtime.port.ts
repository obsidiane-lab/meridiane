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

/** A Mercure update received on the SSE connection. */
export interface MercureUpdate {
  /** Update ID assigned by the hub (SSE `id`). */
  id?: string;
  /** Parsed JSON payload. */
  data: unknown;
}

export interface RealtimePort {
  /**
   * Registers a subscription for as long as the returned Observable is subscribed.
   *
   * Mercure does not tell which subscription matched an update: the stream emits every update received
   * on the connection, and consumers keep the ones that concern them (e.g. by `@id`).
   */
  subscribe$(subscription: MercureSubscription): Observable<MercureUpdate>;

  status$(): Observable<RealtimeStatus>;

  diagnostics$(): Observable<RealtimeDiagnostics>;
}
