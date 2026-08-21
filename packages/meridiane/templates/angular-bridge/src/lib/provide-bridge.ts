import {EnvironmentProviders, makeEnvironmentProviders} from '@angular/core';
import {HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {BridgeOptions} from './bridge-options';
import {BridgeLogger, MercureConnectionMode, MercureTopicMode} from './bridge.types';
import {createAuthInterceptors} from './interceptors/bearer-auth.interceptor';
import {bridgeDebugInterceptor} from './interceptors/bridge-debug.interceptor';
import {bridgeDefaultsInterceptor} from './interceptors/bridge-defaults.interceptor';
import {contentTypeInterceptor} from './interceptors/content-type.interceptor';
import {createSingleFlightInterceptor} from './interceptors/singleflight.interceptor';
import {
  API_BASE_URL,
  BRIDGE_DEFAULTS,
  BRIDGE_HTTP_WITH_CREDENTIALS,
  BRIDGE_LOGGER,
  BRIDGE_MERCURE_WITH_CREDENTIALS,
  MERCURE_CONNECTION_MODE,
  MERCURE_HUB_URL,
  MERCURE_MAX_URL_LENGTH,
  MERCURE_TOPIC_MODE,
} from './tokens';

export type {BridgeAuth, BridgeHttpOptions, BridgeMercureOptions, BridgeOptions} from './bridge-options';

/** Registers the bridge HTTP client, interceptors, Mercure realtime adapter and configuration tokens. */
export function provideBridge(opts: BridgeOptions): EnvironmentProviders {
  const {
    baseUrl,
    auth,
    http,
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
  const mercureWithCredentials = resolveWithCredentials(resolvedMercureInit);
  const httpWithCredentials = http?.withCredentials ?? mercureWithCredentials;

  const loggerProvider: BridgeLogger = createBridgeLogger(debug);

  const interceptors: HttpInterceptorFn[] = [
    contentTypeInterceptor,
    bridgeDefaultsInterceptor,
    ...createAuthInterceptors(auth, baseUrl),
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
    {provide: BRIDGE_HTTP_WITH_CREDENTIALS, useValue: httpWithCredentials},
    {provide: BRIDGE_MERCURE_WITH_CREDENTIALS, useValue: mercureWithCredentials},
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
