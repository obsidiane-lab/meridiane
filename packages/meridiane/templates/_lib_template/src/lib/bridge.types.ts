/**
 * Public configuration types for the bridge.
 *
 * Keep this file dependency-free (no Angular imports) so it can be used from both
 * runtime code and type-only contexts.
 */

export interface BridgeLogger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

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

/**
 * Controls how Mercure topics are sent in the hub URL.
 * - `url`: topics are absolute URLs (recommended default)
 * - `iri`: topics are same-origin relative IRIs (e.g. `/api/...`)
 */
export type MercureTopicMode = 'url' | 'iri';

