import {InjectionToken} from '@angular/core';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

export const MERCURE_HUB_URL = new InjectionToken<string>('MERCURE_HUB_URL');

export const MERCURE_CONFIG = new InjectionToken<RequestInit>('MERCURE_CONFIG');

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
