import { Injectable, inject, signal } from '@angular/core';
import { APP_RUNTIME_CONFIG } from '../config/runtime-config';

type FrontendConfigState = {
  app: {
    version: string;
  };
  brandingName: string;
};

@Injectable({ providedIn: 'root' })
export class FrontendConfigService {
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);
  private readonly configSignal = signal<FrontendConfigState>({
    app: {
      version: this.runtimeConfig.app.version,
    },
    brandingName: 'Meridiane',
  });

  readonly config = this.configSignal.asReadonly();
}
