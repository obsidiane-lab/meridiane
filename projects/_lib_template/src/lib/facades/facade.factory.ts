import {Injectable, Inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {RealtimePort} from '../ports/realtime.port';
import {ResourceRepository, Id} from '../ports/resource-repository.port';
import {API_BASE_URL} from "../tokens";
import {MercureRealtimeAdapter} from "../bridge/sse/mercure.adapter";
import {ApiPlatformRestRepository} from "../bridge/rest/api-platform.adapter";
import {ResourceFacade} from "./resource.facade";

export type FacadeConfig<T> = {
    url: string;
    repo?: ResourceRepository<T>;
    realtime?: RealtimePort<T>;
};


@Injectable({providedIn: 'root'})
export class FacadeFactory {
    constructor(
        private readonly http: HttpClient,
        @Inject(API_BASE_URL) private readonly baseUrl: string,
        private readonly mercureAny: MercureRealtimeAdapter<any>
    ) {
    }

    create<T extends { id: Id }>(config: FacadeConfig<T>): ResourceFacade<T> {
        const path = config.url;
        const repo = config.repo ?? new ApiPlatformRestRepository<T>(this.http, this.baseUrl, path);
        const realtime = config.realtime ?? (this.mercureAny as MercureRealtimeAdapter<T>);
        return new ResourceFacade<T>(repo, realtime, path);
    }
}
