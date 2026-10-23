import {HttpInterceptorFn} from '@angular/common/http';
import {BridgeDefaults} from './bridge.types';

export type BridgeAuth =
  | string
  | {type: 'bearer'; token: string}
  | {type: 'bearer'; getToken: () => string | undefined | Promise<string | undefined>}
  | HttpInterceptorFn;

export interface BridgeMercureOptions {
  /** Mercure hub URL (e.g. `https://api.example.com/.well-known/mercure`), resolved against `baseUrl` when relative. */
  hubUrl: string;
  /**
   * Sends cookies with the subscription request. Default: `true`.
   *
   * Browsers authenticate to a Mercure 1.0 hub with the HttpOnly `__Secure-mercure_access_token`
   * cookie set by the backend (`EventSource` cannot send an `Authorization` header).
   */
  withCredentials?: boolean;
  /**
   * Obtains the Mercure authorization cookie: an API endpoint called with `GET` (e.g. `/api/mercure/authorization`),
   * or a function. Called before the first connection and after each connection refused by the hub
   * (e.g. expired token), before reconnecting.
   *
   * When the endpoint returns (or the function resolves) `{expiresIn: <seconds>}`, the cookie is renewed 5 seconds
   * before it expires: when the hub ends a connection, the browser reconnects with a valid one.
   */
  authorize?: string | (() => Promise<unknown>);
  /**
   * Maximum length of a subscribe URL (without `last_event_id`). Beyond it, or beyond 100 subscriptions,
   * the bridge opens another connection. Default: `4000`.
   */
  maxUrlLength?: number;
}

export interface BridgeHttpOptions {
  /** Enables cookies / credentials on HTTP requests by default. Default: `false`. */
  withCredentials?: boolean;
}

export interface BridgeOptions {
  /** Base URL of the API (e.g. `http://localhost:8000`). */
  baseUrl: string;
  /** Auth strategy used to attach an Authorization header. */
  auth?: BridgeAuth;
  /** Default HTTP transport options. */
  http?: BridgeHttpOptions;
  /** Enables Mercure realtime. */
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
