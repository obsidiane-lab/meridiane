import {InjectionToken} from '@angular/core';
import {BridgeDefaults, BridgeLogger} from './bridge.types';
import {BridgeMercureOptions} from './bridge-options';

/** Base URL of the API (e.g. `http://localhost:8000`). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/** Mercure options; absent when realtime is disabled. */
export const BRIDGE_MERCURE = new InjectionToken<BridgeMercureOptions>('BRIDGE_MERCURE');

/**
 * Default credential policy for HTTP requests.
 * When `true`, the bridge sets `withCredentials: true` on HTTP calls.
 */
export const BRIDGE_HTTP_WITH_CREDENTIALS = new InjectionToken<boolean>('BRIDGE_HTTP_WITH_CREDENTIALS');

export const BRIDGE_LOGGER = new InjectionToken<BridgeLogger>('BRIDGE_LOGGER');

export const BRIDGE_DEFAULTS = new InjectionToken<BridgeDefaults>('BRIDGE_DEFAULTS');
