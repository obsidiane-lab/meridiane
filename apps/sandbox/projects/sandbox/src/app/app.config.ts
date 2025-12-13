import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {provideBridge} from '@obsidiane/bridge-sandbox';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideBridge({
      baseUrl: 'http://localhost:8000',
      mercure: {
        hubUrl: 'http://localhost:8000/.well-known/mercure',
        init: {credentials: 'include'},
      },
      defaults: {
        timeoutMs: 30_000,
        retries: {count: 1, delayMs: 250},
      },
      debug: false,
    })
  ]
};
