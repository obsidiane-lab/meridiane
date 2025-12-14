import {InjectionToken} from '@angular/core';

/** Base URL of the API (e.g. `http://localhost:8000`). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/** Mercure hub URL (e.g. `http://localhost:8000/.well-known/mercure`). */
export const MERCURE_HUB_URL = new InjectionToken<string>('MERCURE_HUB_URL');

/** `RequestInit` used by the Mercure EventSource wrapper (credentials, etc.). */
export const MERCURE_CONFIG = new InjectionToken<RequestInit>('MERCURE_CONFIG');

/**
 * Controls how Mercure topics are sent in the hub URL.
 * - `url`: topics are absolute URLs (recommended default)
 * - `iri`: topics are same-origin relative IRIs (e.g. `/api/...`)
 */
export type MercureTopicMode = 'url' | 'iri';
export const MERCURE_TOPIC_MODE = new InjectionToken<MercureTopicMode>('MERCURE_TOPIC_MODE');

export interface BridgeLogger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export const BRIDGE_DEBUG = new InjectionToken<boolean>('BRIDGE_DEBUG');

export const BRIDGE_LOGGER = new InjectionToken<BridgeLogger>('BRIDGE_LOGGER');

export interface BridgeDefaults {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?:
    | number
    | {
        count: number;
        delayMs?: number;
        methods?: string[];
      };
}

export const BRIDGE_DEFAULTS = new InjectionToken<BridgeDefaults>('BRIDGE_DEFAULTS');
