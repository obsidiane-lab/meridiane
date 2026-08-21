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

/**
 * Controls how SSE connections are managed.
 * - `single`: each watch subscription opens its own SSE connection
 * - `auto`: subscriptions are shared and split into multiple connections only when URL length is too large
 */
export type MercureConnectionMode = 'single' | 'auto';

/**
 * Per-subscription realtime override.
 * - `true`: force an isolated SSE connection for this watch call
 * - `false`/`undefined`: use adapter strategy (`single` or `auto`)
 */
export interface WatchConnectionOptions {
  newConnection?: boolean;
}

export type RealtimeConnectionScope = 'shared' | 'dedicated';

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'closed';

export interface RealtimeConnectionDiagnostics {
  id: string;
  scope: RealtimeConnectionScope;
  status: RealtimeConnectionStatus;
  topicCount: number;
  topics: string[];
  urlLength: number;
}

export interface RealtimeDiagnostics {
  mode: MercureConnectionMode;
  maxUrlLength: number;
  totalConnections: number;
  sharedConnections: number;
  dedicatedConnections: number;
  connections: RealtimeConnectionDiagnostics[];
}
