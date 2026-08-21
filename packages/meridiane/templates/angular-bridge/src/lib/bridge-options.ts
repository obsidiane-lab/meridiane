import {HttpInterceptorFn} from '@angular/common/http';
import {BridgeDefaults, MercureConnectionMode, MercureTopicMode} from './bridge.types';

export type BridgeAuth =
  | string
  | {type: 'bearer'; token: string}
  | {type: 'bearer'; getToken: () => string | undefined | Promise<string | undefined>}
  | HttpInterceptorFn;

export interface BridgeMercureOptions {
  hubUrl?: string;
  init?: RequestInit;
  topicMode?: MercureTopicMode;
  /**
   * Connection strategy for SSE subscriptions.
   * - `single`: one SSE connection per watch subscription
   * - `auto` (default): shared connections with automatic URL-length sharding
   */
  connectionMode?: MercureConnectionMode;
  /**
   * Maximum Mercure URL length before auto-sharding topics into multiple connections.
   * Used only when `connectionMode: 'auto'`. Default: `1900`.
   */
  maxUrlLength?: number;
}

export interface BridgeHttpOptions {
  /**
   * Enables cookies / credentials on HTTP requests by default.
   *
   * When omitted, the bridge preserves the historical behavior and derives the
   * HTTP value from `mercure.init.credentials`.
   */
  withCredentials?: boolean;
}

export interface BridgeOptions {
  /** Base URL of the API (e.g. `http://localhost:8000`). */
  baseUrl: string;
  /** Auth strategy used to attach an Authorization header. */
  auth?: BridgeAuth;
  /** Default HTTP transport options. */
  http?: BridgeHttpOptions;
  /** Use `topicMode` to control the `topic=` values sent to the hub. */
  mercure?: BridgeMercureOptions;
  /** Default HTTP behaviour (headers, timeout, retries). */
  defaults?: BridgeDefaults;
  /**
   * De-duplicates in-flight HTTP requests.
   *
   * - `true` (default): single-flight for safe methods (`GET/HEAD/OPTIONS`)
   * - `false`: disabled (each call triggers a new request)
   */
  singleFlight?: boolean;
  /** Enables debug logging via the debug interceptor and console logger. */
  debug?: boolean;
  /** Extra `HttpInterceptorFn` applied after bridge interceptors. */
  extraInterceptors?: HttpInterceptorFn[];
}
