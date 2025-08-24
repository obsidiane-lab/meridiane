export class MercureUrlBuilder {
  constructor(private readonly apiBase: string) {
  }


  build(hubUrl: string, iris: ReadonlySet<string>, lastEventId?: string): string {
    const url = new URL(hubUrl);
    if (lastEventId) {
      url.searchParams.set('lastEventID', lastEventId);
    }
    url.searchParams.delete('topic');
    for (const iri of iris) {
      url.searchParams.append('topic', this.apiBase + iri);
    }
    return url.toString();
  }
}
