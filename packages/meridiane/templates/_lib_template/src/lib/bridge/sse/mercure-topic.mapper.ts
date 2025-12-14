import {MercureTopicMode} from '../../tokens';

export class MercureTopicMapper {
  private readonly apiBaseUrl: URL;

  constructor(
    apiBase: string,
    private readonly mode: MercureTopicMode,
  ) {
    this.apiBaseUrl = new URL(apiBase);
  }

  /**
   * Canonical value used for ref-counting and as the "topic" query param value.
   * - mode "url": always absolute, same-origin resolved
   * - mode "iri": same-origin path+query+hash ("/api/..."), otherwise keep as-is
   */
  toTopic(input: string): string {
    if (this.mode === 'url') return this.toAbsoluteUrl(input);
    return this.toRelativeIriIfSameOrigin(input);
  }

  /**
   * Canonical value used to compare incoming payload IRIs with subscribed IRIs.
   * We keep payload matching stable by using same-origin relative IRIs ("/api/...").
   */
  toPayloadIri(input: string): string {
    return this.toRelativeIriIfSameOrigin(input);
  }

  private toAbsoluteUrl(input: string): string {
    try {
      return new URL(input, this.apiBaseUrl).toString();
    } catch {
      return input;
    }
  }

  private toRelativeIriIfSameOrigin(input: string): string {
    try {
      const url = new URL(input, this.apiBaseUrl);
      if (url.origin !== this.apiBaseUrl.origin) return input;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return input;
    }
  }
}

