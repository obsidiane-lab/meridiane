import {EnvironmentProviders, makeEnvironmentProviders} from '@angular/core';
import {HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {BridgeOptions} from './bridge-options';
import {BridgeLogger} from './bridge.types';
import {createAuthInterceptors} from './interceptors/bearer-auth.interceptor';
import {bridgeDebugInterceptor} from './interceptors/bridge-debug.interceptor';
import {bridgeDefaultsInterceptor} from './interceptors/bridge-defaults.interceptor';
import {contentTypeInterceptor} from './interceptors/content-type.interceptor';
import {scopeInterceptor} from './interceptors/scoped.interceptor';
import {createSingleFlightInterceptor} from './interceptors/singleflight.interceptor';
import {
  API_BASE_URL,
  BRIDGE_DEFAULTS,
  BRIDGE_HTTP_WITH_CREDENTIALS,
  BRIDGE_LOGGER,
  BRIDGE_MERCURE_WITH_CREDENTIALS,
  MERCURE_HUB_URL,
} from './tokens';
import {resolveUrl} from './utils/url';

export type {BridgeAuth, BridgeHttpOptions, BridgeMercureOptions, BridgeOptions} from './bridge-options';

/** Registers the bridge HTTP client, interceptors, Mercure realtime and configuration tokens. */
export function provideBridge(options: BridgeOptions): EnvironmentProviders {
  const {
    baseUrl,
    auth,
    http,
    mercure,
    defaults,
    singleFlight = true,
    debug = false,
    extraInterceptors = [],
  } = options;

  if (!baseUrl) {
    throw new Error("provideBridge(): missing 'baseUrl'");
  }

  const loggerProvider: BridgeLogger = createBridgeLogger(debug);
  const scopeToBridge = (interceptor: HttpInterceptorFn) => scopeInterceptor(baseUrl, interceptor);

  const interceptors: HttpInterceptorFn[] = [
    scopeToBridge(contentTypeInterceptor),
    scopeToBridge(bridgeDefaultsInterceptor),
    ...createAuthInterceptors(auth, baseUrl),
    ...(singleFlight ? [scopeToBridge(createSingleFlightInterceptor())] : []),
    ...(debug ? [scopeToBridge(bridgeDebugInterceptor)] : []),
    ...extraInterceptors,
  ];

  return makeEnvironmentProviders([
    provideHttpClient(
      withFetch(),
      withInterceptors(interceptors)
    ),
    {provide: API_BASE_URL, useValue: baseUrl},
    {provide: BRIDGE_HTTP_WITH_CREDENTIALS, useValue: http?.withCredentials ?? false},
    {provide: BRIDGE_MERCURE_WITH_CREDENTIALS, useValue: mercure?.withCredentials ?? true},
    ...(mercure?.hubUrl ? [{provide: MERCURE_HUB_URL, useValue: resolveUrl(baseUrl, mercure.hubUrl)}] : []),
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
