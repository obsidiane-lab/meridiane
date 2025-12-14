export class MercureUrlBuilder {
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
