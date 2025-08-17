import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {provideBridge} from '../bridge-sandbox/src/lib/provide-bridge';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideBridge({
      apiBaseUrl: 'http://localhost:8000',
      mercure: {credentials: 'include'},
      mercureHubUrl: 'http://localhost:8000/.well-known/mercure',
    })
  ]
};
