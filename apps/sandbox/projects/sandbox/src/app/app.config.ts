import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {provideBridge} from '@obsidiane/bridge-sandbox';
import {BACKEND_BASE_URL, MERCURE_HUB_URL} from './core/backend';
import {getStoredToken} from './core/auth-state.service';
import {readSandboxRealtimeConfig} from './core/realtime-config';

const realtimeConfig = readSandboxRealtimeConfig();

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideBridge({
      baseUrl: BACKEND_BASE_URL,
      mercure: {
        hubUrl: MERCURE_HUB_URL,
        init: {credentials: 'include'},
        topicMode: "url",
        connectionMode: realtimeConfig.connectionMode,
        maxUrlLength: realtimeConfig.maxUrlLength,
      },
      auth: {type: 'bearer', getToken: getStoredToken},
      defaults: {
        timeoutMs: 30_000,
        retries: {count: 1, delayMs: 250},
      },
      debug: false,
    })
  ]
};
