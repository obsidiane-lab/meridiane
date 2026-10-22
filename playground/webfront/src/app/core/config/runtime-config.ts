import { InjectionToken } from '@angular/core';

export type FrontendRuntimeConfig = {
  production: boolean;
  apiBaseUrl: string;
  mercureHubUrl: string;
  version: string;
};

export type AppRuntimeConfig = {
  app: FrontendRuntimeConfig;
};

type RuntimeConfigOverrides = Partial<{
  app: Partial<FrontendRuntimeConfig>;
}>;

export const APP_RUNTIME_CONFIG = new InjectionToken<AppRuntimeConfig>('app.runtime.config');

export async function loadRuntimeConfig(path = '/assets/config.json'): Promise<AppRuntimeConfig> {
  try {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Runtime config: unable to load "${path}" (${response.status}).`);
    }

    const json = (await response.json()) as RuntimeConfigOverrides;
    return resolveRuntimeConfig(json ?? {});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    throw new Error(`Runtime config: failed to resolve configuration. ${message}`, { cause: error });
  }
}

function resolveRuntimeConfig(overrides: RuntimeConfigOverrides): AppRuntimeConfig {
  const apiBaseUrl = resolveUrl(overrides.app?.apiBaseUrl, '/');
  const mercureHubUrl = resolveUrl(overrides.app?.mercureHubUrl, '/.well-known/mercure');
  const version = resolveOptionalString(overrides.app?.version) ?? '';

  return {
    app: {
      production: overrides.app?.production ?? false,
      apiBaseUrl,
      mercureHubUrl,
      version,
    },
  };
}

function resolveUrl(value: string | undefined, fallbackPath: string): string {
  const raw = resolveOptionalString(value) ?? fallbackPath;
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return new URL(normalized, window.location.origin).toString();
}

function resolveOptionalString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
