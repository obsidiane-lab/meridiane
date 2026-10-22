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
 * State of the Mercure connection.
 * - `closed`: no active subscription (or realtime disabled)
 * - `connecting`: opening, reconnecting, or waiting before a retry
 * - `connected`: the hub accepted the subscription and the stream is open
 */
export type RealtimeStatus = 'closed' | 'connecting' | 'connected';

export interface RealtimeSubscriptionDiagnostics {
  match: string;
  type: 'exact' | 'urlpattern';
  /** Number of active `watch$()` streams sharing this subscription. */
  consumers: number;
}

export interface RealtimeDiagnostics {
  status: RealtimeStatus;
  /** Current subscribe URL (without `last_event_id`). */
  url?: string;
  subscriptions: RealtimeSubscriptionDiagnostics[];
  /** Last update ID received, used to request replay after a reconnection. */
  lastEventId?: string;
  /** Consecutive connections refused by the hub (authentication, authorization or network). */
  failures: number;
}
