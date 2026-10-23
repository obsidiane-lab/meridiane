import {inject, Injectable} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {RealtimePort} from '../ports/realtime.port';
import {Item} from '../ports/resource-repository.port';
import {API_BASE_URL} from '../tokens';
import {MercureHub} from '../bridge/sse/mercure-hub';
import {ResourceTopic} from '../bridge/sse/resource-topic';
import {resolveUrl, toAbsoluteUrl, trimTrailingSlash} from '../utils/url';
import {BridgeFacade} from './bridge.facade';
import {ResourceFacade} from './resource.facade';

export type FacadeConfig = {
  /** Collection path of the resource (e.g. `/api/books`). */
  url: string;
  /**
   * URL Pattern of the resource item IRIs, i.e. the Mercure topics API Platform publishes on.
   * Default: `{url}/:id`. Relative patterns are resolved against `baseUrl`.
   */
  topic?: string;
  realtime?: RealtimePort;
};

@Injectable({providedIn: 'root'})
export class FacadeFactory {
  private readonly bridge = inject(BridgeFacade);
  private readonly mercure = inject(MercureHub);
  /** Mercure topics are absolute URLs: a relative `baseUrl` is resolved against the document base. */
  private readonly topicBaseUrl = toAbsoluteUrl(inject(API_BASE_URL), inject(DOCUMENT).baseURI);

  create<T extends Item>(config: FacadeConfig): ResourceFacade<T> {
    const topic = new ResourceTopic(
      resolveUrl(this.topicBaseUrl, config.topic ?? `${trimTrailingSlash(config.url)}/:id`),
      this.topicBaseUrl
    );
    return new ResourceFacade<T>(this.bridge, config.url, config.realtime ?? this.mercure, topic);
  }
}
