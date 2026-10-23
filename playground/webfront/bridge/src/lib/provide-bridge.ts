import {EnvironmentProviders, makeEnvironmentProviders} from '@angular/core';
import {HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {BridgeOptions} from './bridge-options';
import {BridgeLogger} from './bridge.types';
import {createAuthInterceptor} from './interceptors/bearer-auth.interceptor';
import {bridgeDebugInterceptor} from './interceptors/bridge-debug.interceptor';
import {bridgeDefaultsInterceptor} from './interceptors/bridge-defaults.interceptor';
import {contentTypeInterceptor} from './interceptors/content-type.interceptor';
import {scopeInterceptor} from './interceptors/scoped.interceptor';
import {singleFlightInterceptor} from './interceptors/singleflight.interceptor';
import {
  API_BASE_URL,
  BRIDGE_DEFAULTS,
  BRIDGE_HTTP_WITH_CREDENTIALS,
  BRIDGE_LOGGER,
  BRIDGE_MERCURE,
} from './tokens';

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
  const authInterceptor = createAuthInterceptor(auth);

  // Configured defaults come before the bridge headers, which are only added when absent.
  // Single-flight comes after the application interceptors, so it compares the final requests.
  const interceptors: HttpInterceptorFn[] = [
    scopeToBridge(bridgeDefaultsInterceptor),
    scopeToBridge(contentTypeInterceptor),
    ...(authInterceptor ? [scopeToBridge(authInterceptor)] : []),
    ...extraInterceptors,
    ...(singleFlight ? [scopeToBridge(singleFlightInterceptor)] : []),
    ...(debug ? [scopeToBridge(bridgeDebugInterceptor)] : []),
  ];

  return makeEnvironmentProviders([
    provideHttpClient(
      withFetch(),
      withInterceptors(interceptors)
    ),
    {provide: API_BASE_URL, useValue: baseUrl},
    {provide: BRIDGE_HTTP_WITH_CREDENTIALS, useValue: http?.withCredentials ?? false},
    ...(mercure?.hubUrl ? [{provide: BRIDGE_MERCURE, useValue: mercure}] : []),
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
