import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideNgIconsConfig, withExceptionLogger } from '@ng-icons/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideTranslateService, TranslateService, type TranslationObject } from '@ngx-translate/core';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { provideBridge } from 'bridge';
import { appRoutes } from './app.routes';
import { APP_RUNTIME_CONFIG, AppRuntimeConfig } from './core/config/runtime-config';

export function createAppConfig(runtimeConfig: AppRuntimeConfig): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideSpartanHlm(),
      provideRouter(appRoutes, withComponentInputBinding(), withViewTransitions()),
      provideTranslateService({ fallbackLang: 'fr' }),
      provideAppInitializer(() => {
        const translate = inject(TranslateService);
        return import('../assets/i18n/fr.json').then(({ default: translations }) => {
          translate.setTranslation('fr', translations as TranslationObject);
          translate.use('fr');
        });
      }),
      provideNgIconsConfig({}, withExceptionLogger()),
      { provide: APP_RUNTIME_CONFIG, useValue: runtimeConfig },
      provideBridge({
        baseUrl: runtimeConfig.app.apiBaseUrl,
        mercure: { hubUrl: runtimeConfig.app.mercureHubUrl },
      }),
    ],
  };
}
