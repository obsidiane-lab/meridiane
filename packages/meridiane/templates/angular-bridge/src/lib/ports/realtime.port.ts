import {Observable} from 'rxjs';
import {Iri} from './resource-repository.port';
import {WatchConnectionOptions} from '../bridge.types';

export type RealtimeStatus = 'connecting' | 'connected' | 'closed';

export interface SseEvent {
  type: string;
  data: string;
  lastEventId?: string;
}

export interface SseOptions {
  withCredentials?: boolean;
}

export interface RealtimeEvent<T> {
  iri: string;
  /**
   * Matched subscription topic (normalized).
   *
   * - When matching by `@id`, this is typically the same as `iri`.
   * - When matching by a relation field (e.g. `conversation`), this is the parent topic IRI.
   */
  topic?: string;
  data?: T;
}

export type SubscribeFilter = {
  /**
   * Single relation path used to match events to subscription topics.
   * Example: `conversation` or `embedded.author`.
   */
  field?: string;
  /**
   * Multiple relation paths used to match events to subscription topics.
   */
  fields?: string[];
  /**
   * When relation fields are provided, also include events whose `@id` matches the subscribed topics.
   *
   * Default:
   * - `true` when no relation fields are provided (match by `@id`)
   * - `false` when relation fields are provided (sub-resource mode)
   */
  includeSelf?: boolean;
};

export interface RealtimePort {
  /**
   * Subscribes to Mercure events for the given topics.
   *
   * Note: topics must be stable strings. Undefined values are ignored by the adapter.
   */
  subscribe$<T>(iris: Iri[], filter?: SubscribeFilter, options?: WatchConnectionOptions): Observable<RealtimeEvent<T>>;

  /**
   * Subscribes to all JSON payloads received on the given Mercure topics.
   *
   * No payload-to-topic matching is applied.
   */
  subscribeAll$<T>(iris: Iri[], options?: WatchConnectionOptions): Observable<RealtimeEvent<T>>;

  unsubscribe(iris: Iri[]): void;

  status$(): Observable<RealtimeStatus>;
}
