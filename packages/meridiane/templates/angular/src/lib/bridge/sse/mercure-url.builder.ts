export class MercureUrlBuilder {
  /**
   * Builds the Mercure hub URL with one `topic=` parameter per topic.
   * The adapter is responsible for canonicalising topics beforehand.
   */
  build(hubUrl: string, topics: ReadonlySet<string>, lastEventId?: string): string {
    const url = new URL(hubUrl);
    if (lastEventId) {
      url.searchParams.set('lastEventID', lastEventId);
    }
    url.searchParams.delete('topic');
    for (const topic of topics) {
      url.searchParams.append('topic', topic);
    }
    return url.toString();
  }
}
