import {EnvironmentInjector, inject, Injectable, runInInjectionContext} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {RealtimePort} from '../ports/realtime.port';
import {Item, ResourceRepository} from '../ports/resource-repository.port';
import {API_BASE_URL, BRIDGE_HTTP_WITH_CREDENTIALS} from '../tokens';
import {MercureHub} from '../bridge/sse/mercure-hub';
import {ResourceTopic} from '../bridge/sse/resource-topic';
import {ApiPlatformRestRepository} from '../bridge/rest/api-platform.adapter';
import {toAbsoluteUrl} from '../utils/absolute-url';
import {resolveUrl} from '../utils/url';
import {ResourceFacade} from './resource.facade';

export type FacadeConfig<T> = {
  /** Collection path of the resource (e.g. `/api/books`). */
  url: string;
  /**
   * URL Pattern of the resource item IRIs, i.e. the Mercure topics API Platform publishes on.
   * Default: `{url}/:id`. Relative patterns are resolved against `baseUrl`.
   */
  topic?: string;
  repo?: ResourceRepository<T>;
  realtime?: RealtimePort;
};

@Injectable({providedIn: 'root'})
export class FacadeFactory {
  private readonly env = inject(EnvironmentInjector);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly httpWithCredentials = inject(BRIDGE_HTTP_WITH_CREDENTIALS);
  private readonly mercure = inject(MercureHub);
  /** Mercure topics are absolute URLs: a relative `baseUrl` is resolved against the document base. */
  private readonly topicBaseUrl = toAbsoluteUrl(this.baseUrl, inject(DOCUMENT).baseURI);

  /**
   * Creates a `ResourceFacade<T>`.
   *
   * Important: `ResourceFacade` uses `toSignal()`, which requires an injection context.
   * This factory ensures that by using `runInInjectionContext`.
   */
  create<T extends Item>(config: FacadeConfig<T>): ResourceFacade<T> {
    const url = config.url;
    const repo = config.repo ?? new ApiPlatformRestRepository<T>(this.http, this.baseUrl, url, this.httpWithCredentials);
    const realtime = config.realtime ?? this.mercure;
    const topic = new ResourceTopic(
      resolveUrl(this.topicBaseUrl, config.topic ?? `${trimTrailingSlash(url)}/:id`),
      this.topicBaseUrl
    );

    return runInInjectionContext(this.env, () => new ResourceFacade<T>(repo, realtime, topic));
  }
}

function trimTrailingSlash(path: string): string {
  return path.endsWith('/') ? path.slice(0, -1) : path;
}
