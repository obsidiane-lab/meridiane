import {EnvironmentProviders, makeEnvironmentProviders} from '@angular/core';
import {HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {
  API_BASE_URL,
  BRIDGE_DEBUG,
  BRIDGE_DEFAULTS,
  BRIDGE_LOGGER,
  BridgeDefaults,
  BridgeLogger,
  MercureTopicMode,
  MERCURE_CONFIG,
  MERCURE_HUB_URL,
  MERCURE_TOPIC_MODE,
} from './tokens';
import {contentTypeInterceptor} from './interceptors/content-type.interceptor';
import {bridgeDefaultsInterceptor} from './interceptors/bridge-defaults.interceptor';
import {bridgeDebugInterceptor} from './interceptors/bridge-debug.interceptor';
import {from, switchMap} from 'rxjs';

export type BridgeAuth =
  | string
  | {type: 'bearer'; token: string}
  | {type: 'bearer'; getToken: () => string | undefined | Promise<string | undefined>}
  | HttpInterceptorFn;

export interface BridgeMercureOptions {
  hubUrl?: string;
  init?: RequestInit;
  topicMode?: MercureTopicMode;
}

export interface BridgeOptions {
  baseUrl?: string;
  apiBaseUrl?: string;
  auth?: BridgeAuth;
  mercure?: BridgeMercureOptions | RequestInit;
  mercureHubUrl?: string;
  defaults?: BridgeDefaults;
  debug?: boolean;
  extraInterceptors?: HttpInterceptorFn[];
}

export function provideBridge(opts: BridgeOptions): EnvironmentProviders {
  const {
    baseUrl,
    apiBaseUrl,
    auth,
    mercure,
    mercureHubUrl,
    defaults,
    debug = false,
    extraInterceptors = [],
  } = opts;

  const resolvedBaseUrl = baseUrl ?? apiBaseUrl;
  if (!resolvedBaseUrl) {
    throw new Error("provideBridge(): missing 'baseUrl' (or legacy 'apiBaseUrl')");
  }

  const resolvedMercure: BridgeMercureOptions =
    mercure && typeof mercure === 'object' && ('hubUrl' in (mercure as any) || 'init' in (mercure as any))
      ? (mercure as BridgeMercureOptions)
      : {init: mercure as RequestInit | undefined};

  const resolvedMercureInit: RequestInit = resolvedMercure.init ?? {credentials: 'include' as RequestCredentials};
  const resolvedMercureHubUrl = resolvedMercure.hubUrl ?? mercureHubUrl;
  const resolvedMercureTopicMode: MercureTopicMode = resolvedMercure.topicMode ?? 'url';

  const loggerProvider: BridgeLogger = createBridgeLogger(debug);

  const interceptors: HttpInterceptorFn[] = [
    contentTypeInterceptor,
    bridgeDefaultsInterceptor,
    ...createAuthInterceptors(auth),
    ...(debug ? [bridgeDebugInterceptor] : []),
    ...extraInterceptors,
  ];

  return makeEnvironmentProviders([
    provideHttpClient(
      withFetch(),
      withInterceptors(interceptors)
    ),
    {provide: API_BASE_URL, useValue: resolvedBaseUrl},
    {provide: MERCURE_CONFIG, useValue: resolvedMercureInit},
    ...(resolvedMercureHubUrl ? [{provide: MERCURE_HUB_URL, useValue: resolvedMercureHubUrl}] : []),
    {provide: MERCURE_TOPIC_MODE, useValue: resolvedMercureTopicMode},
    {provide: BRIDGE_DEBUG, useValue: debug},
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
