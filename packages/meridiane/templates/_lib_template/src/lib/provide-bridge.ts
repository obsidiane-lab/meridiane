import {EnvironmentProviders, Provider, makeEnvironmentProviders} from '@angular/core';
import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {API_BASE_URL, MERCURE_CONFIG, MERCURE_HUB_URL} from './tokens';
import {contentTypeInterceptor} from './interceptors/content-type.interceptor';

export interface BridgeOptions {
  apiBaseUrl: string;
  mercure?: RequestInit;
  mercureHubUrl?: string;
  extraInterceptors?: any[];
}

export function provideBridge(opts: BridgeOptions): EnvironmentProviders {
  const {
    apiBaseUrl,
    mercure = {credentials: 'include' as RequestCredentials},
    mercureHubUrl,
    extraInterceptors = [],

  } = opts;

  return makeEnvironmentProviders([
    provideHttpClient(
      withFetch(),
      withInterceptors([
        contentTypeInterceptor,
        ...extraInterceptors

      ])
    ),
    {provide: API_BASE_URL, useValue: apiBaseUrl},
    {provide: MERCURE_CONFIG, useValue: mercure},
    ...(mercureHubUrl ? [{provide: MERCURE_HUB_URL, useValue: mercureHubUrl}] : []),
  ]);
}
