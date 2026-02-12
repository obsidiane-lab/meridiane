export type SandboxMercureConnectionMode = 'auto' | 'single';

export interface SandboxRealtimeConfig {
  connectionMode: SandboxMercureConnectionMode;
  maxUrlLength: number;
}

const MODE_KEY = 'MERIDIANE_SANDBOX_MERCURE_CONNECTION_MODE';
const MAX_URL_LENGTH_KEY = 'MERIDIANE_SANDBOX_MERCURE_MAX_URL_LENGTH';

const DEFAULT_CONFIG: SandboxRealtimeConfig = {
  connectionMode: 'auto',
  maxUrlLength: 1900,
};

export function readSandboxRealtimeConfig(): SandboxRealtimeConfig {
  if (!isBrowser()) return DEFAULT_CONFIG;

  const rawMode = localStorage.getItem(MODE_KEY);
  const rawMaxUrlLength = localStorage.getItem(MAX_URL_LENGTH_KEY);

  const connectionMode = parseConnectionMode(rawMode, DEFAULT_CONFIG.connectionMode);
  const maxUrlLength = parseMaxUrlLength(rawMaxUrlLength, DEFAULT_CONFIG.maxUrlLength);

  return {connectionMode, maxUrlLength};
}

export function saveSandboxRealtimeConfig(partial: Partial<SandboxRealtimeConfig>): SandboxRealtimeConfig {
  if (!isBrowser()) return DEFAULT_CONFIG;

  const previous = readSandboxRealtimeConfig();
  const next: SandboxRealtimeConfig = {
    connectionMode: parseConnectionMode(partial.connectionMode, previous.connectionMode),
    maxUrlLength: parseMaxUrlLength(partial.maxUrlLength, previous.maxUrlLength),
  };

  localStorage.setItem(MODE_KEY, next.connectionMode);
  localStorage.setItem(MAX_URL_LENGTH_KEY, String(next.maxUrlLength));

  return next;
}

export function resetSandboxRealtimeConfig(): SandboxRealtimeConfig {
  if (!isBrowser()) return DEFAULT_CONFIG;
  localStorage.removeItem(MODE_KEY);
  localStorage.removeItem(MAX_URL_LENGTH_KEY);
  return DEFAULT_CONFIG;
}

function parseConnectionMode(
  raw: unknown,
  fallback: SandboxMercureConnectionMode
): SandboxMercureConnectionMode {
  return raw === 'single' || raw === 'auto' ? raw : fallback;
}

function parseMaxUrlLength(raw: unknown, fallback: number): number {
  const parsed = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;

  const intValue = Math.floor(parsed);
  return intValue >= 256 ? intValue : fallback;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}
