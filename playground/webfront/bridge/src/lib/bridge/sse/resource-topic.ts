import type {Item} from '../../ports/resource-repository.port';
import type {MercureSubscription} from '../../ports/realtime.port';
import {resolveUrl} from '../../utils/url';

/** Payload API Platform publishes on deletion: `{"@id"}`, plus `@type` with `mercure.include_type`. */
export interface ResourceDeletion {
  '@id': string;
  '@type'?: string | string[];
}

interface UrlPatternLike {
  test(input: string): boolean;
}

type UrlPatternConstructor = new (input: string) => UrlPatternLike;

/**
 * Recognizes the deletion payload API Platform builds by hand. Creations and updates are serialized
 * resources, which always carry `@context` in JSON-LD.
 */
export function isResourceDeletion(payload: object): payload is ResourceDeletion {
  return typeof (payload as ResourceDeletion)['@id'] === 'string'
    && Object.keys(payload).every((key) => key === '@id' || key === '@type');
}

/**
 * A resource URL Pattern or an exact item IRI, as published by API Platform.
 * The same selector is sent to the hub and used to route updates by `@id`.
 */
export class ResourceTopic implements MercureSubscription {
  readonly match: string;
  readonly type: MercureSubscription['type'];
  private readonly apiBaseUrl: string;
  private pattern?: UrlPatternLike;

  constructor(
    match: string,
    apiBaseUrl: string,
    type: MercureSubscription['type'] = 'urlpattern',
  ) {
    this.match = match;
    this.apiBaseUrl = apiBaseUrl;
    this.type = type;
  }

  forIri(iri: string): ResourceTopic {
    if (!iri.trim()) throw new Error('ResourceFacade.watch$(): missing resource IRI');
    return new ResourceTopic(resolveUrl(this.apiBaseUrl, iri), this.apiBaseUrl, 'exact');
  }

  /** Returns the original payload, or `undefined` when it belongs to another resource. */
  toResource<T extends Item>(payload: unknown): T | ResourceDeletion | undefined {
    if (!isRecord(payload)) return undefined;

    const iri = payload['@id'];
    if (typeof iri !== 'string' || !this.matches(iri)) return undefined;

    return payload as T | ResourceDeletion;
  }

  private matches(iri: string): boolean {
    const url = resolveUrl(this.apiBaseUrl, iri);
    if (this.type === 'exact') return url === this.match;
    this.pattern ??= compileUrlPattern(this.match);
    return this.pattern.test(url);
  }
}

function compileUrlPattern(pattern: string): UrlPatternLike {
  const URLPatternImpl = (globalThis as {URLPattern?: UrlPatternConstructor}).URLPattern;
  if (!URLPatternImpl) {
    throw new Error('URLPattern is not available in this environment: load a polyfill such as `urlpattern-polyfill`.');
  }
  return new URLPatternImpl(pattern);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
