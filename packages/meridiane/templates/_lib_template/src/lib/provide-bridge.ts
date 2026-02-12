import {EnvironmentProviders, makeEnvironmentProviders} from '@angular/core';
import {HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {
  API_BASE_URL,
  BRIDGE_DEFAULTS,
  BRIDGE_LOGGER,
  BRIDGE_WITH_CREDENTIALS,
  MERCURE_CONNECTION_MODE,
  MERCURE_HUB_URL,
  MERCURE_MAX_URL_LENGTH,
  MERCURE_TOPIC_MODE,
} from './tokens';
import {BridgeDefaults, BridgeLogger, MercureConnectionMode, MercureTopicMode} from './bridge.types';
import {contentTypeInterceptor} from './interceptors/content-type.interceptor';
import {bridgeDefaultsInterceptor} from './interceptors/bridge-defaults.interceptor';
import {bridgeDebugInterceptor} from './interceptors/bridge-debug.interceptor';
import {from, switchMap} from 'rxjs';
import {createSingleFlightInterceptor} from './interceptors/singleflight.interceptor';

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

export interface BridgeOptions {
  /** Base URL of the API (e.g. `http://localhost:8000`). */
  baseUrl: string;
  /** Auth strategy used to attach an Authorization header. */
  auth?: BridgeAuth;
  /**
   * Use `topicMode` to control the `topic=` values sent to the hub.
   */
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

/** Registers the bridge HTTP client, interceptors, Mercure realtime adapter and configuration tokens. */
export function provideBridge(opts: BridgeOptions): EnvironmentProviders {
  const {
    baseUrl,
    auth,
    mercure,
    defaults,
    singleFlight = true,
    debug = false,
    extraInterceptors = [],
  } = opts;

  if (!baseUrl) {
    throw new Error("provideBridge(): missing 'baseUrl'");
  }

  const resolvedMercureInit: RequestInit = mercure?.init ?? {credentials: 'include' as RequestCredentials};
  const resolvedMercureHubUrl = mercure?.hubUrl;
  const resolvedMercureTopicMode: MercureTopicMode = mercure?.topicMode ?? 'url';
  const resolvedMercureConnectionMode: MercureConnectionMode = mercure?.connectionMode ?? 'auto';
  const resolvedMercureMaxUrlLength = normalizeMercureMaxUrlLength(mercure?.maxUrlLength, 1900);
  const withCredentials = resolveWithCredentials(resolvedMercureInit);

  const loggerProvider: BridgeLogger = createBridgeLogger(debug);

  const interceptors: HttpInterceptorFn[] = [
    contentTypeInterceptor,
    bridgeDefaultsInterceptor,
    ...createAuthInterceptors(auth),
    ...(singleFlight ? [createSingleFlightInterceptor('safe')] : [createSingleFlightInterceptor('off')]),
    ...(debug ? [bridgeDebugInterceptor] : []),
    ...extraInterceptors,
  ];

  return makeEnvironmentProviders([
    provideHttpClient(
      withFetch(),
      withInterceptors(interceptors)
    ),
    {provide: API_BASE_URL, useValue: baseUrl},
    {provide: BRIDGE_WITH_CREDENTIALS, useValue: withCredentials},
    ...(resolvedMercureHubUrl ? [{provide: MERCURE_HUB_URL, useValue: resolvedMercureHubUrl}] : []),
    {provide: MERCURE_TOPIC_MODE, useValue: resolvedMercureTopicMode},
    {provide: MERCURE_CONNECTION_MODE, useValue: resolvedMercureConnectionMode},
    {provide: MERCURE_MAX_URL_LENGTH, useValue: resolvedMercureMaxUrlLength},
    {provide: BRIDGE_DEFAULTS, useValue: defaults ?? {}},
    {provide: BRIDGE_LOGGER, useValue: loggerProvider},
  ]);
}

function createBridgeLogger(debug: boolean): BridgeLogger {
  const noop = () => undefined;
  return {
    debug: debug ? console.debug.bind(console) : noop,
    info: debug ? console.info.bind(console) : noop,
    warn: debug ? console.warn.bind(console) : noop,
    error: console.error.bind(console),
  };
}

function resolveWithCredentials(init: RequestInit | undefined): boolean {
  if (!init) return false;
  const anyInit = init as RequestInit & {withCredentials?: boolean};
  return anyInit.withCredentials === true || init.credentials === 'include';
}

function normalizeMercureMaxUrlLength(input: unknown, fallback: number): number {
  const value = typeof input === 'number' ? Math.floor(input) : fallback;
  return Number.isFinite(value) && value >= 256 ? value : fallback;
}

function createAuthInterceptors(auth?: BridgeAuth): HttpInterceptorFn[] {
  if (!auth) return [];

  if (typeof auth === 'function') {
    return [auth as HttpInterceptorFn];
  }

  const bearer =
    typeof auth === 'string'
      ? {type: 'bearer' as const, token: auth}
      : (auth as Exclude<BridgeAuth, string | HttpInterceptorFn>);

  if (bearer.type !== 'bearer') return [];

  if ('token' in bearer) {
    const token = bearer.token;
    return [createBearerAuthInterceptor(() => token)];
  }

  return [createBearerAuthInterceptor(bearer.getToken)];
}

function createBearerAuthInterceptor(getToken: () => string | undefined | Promise<string | undefined>): HttpInterceptorFn {
  return (req, next) => {
    if (req.headers.has('Authorization')) return next(req);
    return from(Promise.resolve(getToken())).pipe(
      switchMap((token) => {
        if (!token) return next(req);
        return next(req.clone({headers: req.headers.set('Authorization', `Bearer ${token}`)}));
      })
    );
  };
}
