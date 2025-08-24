import {Injectable, Inject, runInInjectionContext, inject, EnvironmentInjector} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {RealtimePort} from '../ports/realtime.port';
import {ResourceRepository, Id} from '../ports/resource-repository.port';
import {API_BASE_URL, MERCURE_CONFIG} from "../tokens";
import {MercureRealtimeAdapter} from "../bridge/sse/mercure.adapter";
import {ApiPlatformRestRepository} from "../bridge/rest/api-platform.adapter";
import {ResourceFacade} from "./resource.facade";

export type FacadeConfig<T> = {
  url: string;
  repo?: ResourceRepository<T>;
  realtime?: RealtimePort;
};


@Injectable({providedIn: 'root'})
export class FacadeFactory {

  private env = inject(EnvironmentInjector);

  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly baseUrl: string,
    @Inject(MERCURE_CONFIG) private readonly init: string,
    private readonly mercureAny: MercureRealtimeAdapter
  ) {
  }

  create<T extends { id?: Id }>(config: FacadeConfig<T>): ResourceFacade<T> {
    const path = config.url;
    const repo = new ApiPlatformRestRepository<T>(this.http, this.baseUrl, path , this.init);
    const realtime = this.mercureAny as MercureRealtimeAdapter;
    return runInInjectionContext(this.env, () => new ResourceFacade<T>(repo, realtime, path));
  }
}
