import {InjectionToken} from '@angular/core';
import {BridgeDefaults, BridgeLogger, MercureConnectionMode, MercureTopicMode} from './bridge.types';

/** Base URL of the API (e.g. `http://localhost:8000`). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/** Mercure hub URL (e.g. `http://localhost:8000/.well-known/mercure`). */
export const MERCURE_HUB_URL = new InjectionToken<string>('MERCURE_HUB_URL');

/**
 * Default credential policy for HTTP requests.
 * When `true`, the bridge sets `withCredentials: true` on HTTP calls.
 */
export const BRIDGE_HTTP_WITH_CREDENTIALS = new InjectionToken<boolean>('BRIDGE_HTTP_WITH_CREDENTIALS');

/**
 * Default credential policy for Mercure EventSource.
 * When `true`, the bridge opens SSE connections with cookies enabled.
 */
export const BRIDGE_MERCURE_WITH_CREDENTIALS = new InjectionToken<boolean>('BRIDGE_MERCURE_WITH_CREDENTIALS');

export const MERCURE_TOPIC_MODE = new InjectionToken<MercureTopicMode>('MERCURE_TOPIC_MODE');

export const MERCURE_CONNECTION_MODE = new InjectionToken<MercureConnectionMode>('MERCURE_CONNECTION_MODE');

export const MERCURE_MAX_URL_LENGTH = new InjectionToken<number>('MERCURE_MAX_URL_LENGTH');

export const BRIDGE_LOGGER = new InjectionToken<BridgeLogger>('BRIDGE_LOGGER');

export const BRIDGE_DEFAULTS = new InjectionToken<BridgeDefaults>('BRIDGE_DEFAULTS');
