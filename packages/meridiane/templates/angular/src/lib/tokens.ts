import {InjectionToken} from '@angular/core';
import {BridgeDefaults, BridgeLogger, MercureTopicMode} from './bridge.types';

/** Base URL of the API (e.g. `http://localhost:8000`). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/** Mercure hub URL (e.g. `http://localhost:8000/.well-known/mercure`). */
export const MERCURE_HUB_URL = new InjectionToken<string>('MERCURE_HUB_URL');

/**
 * Default credential policy for HTTP requests and Mercure EventSource.
 * When `true`, the bridge sets `withCredentials: true` on HTTP calls and uses cookies for SSE.
 */
export const BRIDGE_WITH_CREDENTIALS = new InjectionToken<boolean>('BRIDGE_WITH_CREDENTIALS');

export const MERCURE_TOPIC_MODE = new InjectionToken<MercureTopicMode>('MERCURE_TOPIC_MODE');

export const BRIDGE_LOGGER = new InjectionToken<BridgeLogger>('BRIDGE_LOGGER');

export const BRIDGE_DEFAULTS = new InjectionToken<BridgeDefaults>('BRIDGE_DEFAULTS');
