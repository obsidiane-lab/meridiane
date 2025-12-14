import {EnvironmentInjector, inject, Injectable, runInInjectionContext} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {RealtimePort} from '../ports/realtime.port';
import {Item, ResourceRepository} from '../ports/resource-repository.port';
import {API_BASE_URL, BRIDGE_WITH_CREDENTIALS} from '../tokens';
import {MercureRealtimeAdapter} from '../bridge/sse/mercure.adapter';
import {ApiPlatformRestRepository} from '../bridge/rest/api-platform.adapter';
import {ResourceFacade} from './resource.facade';

export type FacadeConfig<T> = {
  url: string;
  repo?: ResourceRepository<T>;
  realtime?: RealtimePort;
};


@Injectable({providedIn: 'root'})
export class FacadeFactory {
  private readonly env = inject(EnvironmentInjector);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly withCredentials = inject(BRIDGE_WITH_CREDENTIALS);
  private readonly mercure = inject(MercureRealtimeAdapter);

  /**
   * Creates a `ResourceFacade<T>`.
   *
   * Important: `ResourceFacade` uses `toSignal()`, which requires an injection context.
   * This factory ensures that by using `runInInjectionContext`.
   */
  create<T extends Item>(config: FacadeConfig<T>): ResourceFacade<T> {
    const url = config.url;
    const repo = config.repo ?? new ApiPlatformRestRepository<T>(this.http, this.baseUrl, url, this.withCredentials);
    const realtime = config.realtime ?? this.mercure;

    return runInInjectionContext(this.env, () => new ResourceFacade<T>(repo, realtime));
  }
}
