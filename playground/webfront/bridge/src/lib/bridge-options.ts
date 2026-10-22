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
