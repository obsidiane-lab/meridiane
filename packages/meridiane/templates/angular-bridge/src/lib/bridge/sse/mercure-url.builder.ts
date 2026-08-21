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

  partitionTopics(hubUrl: string, topics: Iterable<string>, maxUrlLength: number, allowSplit: boolean): string[][] {
    const sortedTopics = [...new Set(topics)].sort();
    if (sortedTopics.length === 0) return [];
    if (!allowSplit) return [sortedTopics];

    const partitions: string[][] = [];
    let current: string[] = [];

    for (const topic of sortedTopics) {
      const candidate = [...current, topic];
      if (current.length > 0 && this.build(hubUrl, new Set(candidate)).length > maxUrlLength) {
        partitions.push(current);
        current = [topic];
      } else {
        current = candidate;
      }
    }

    if (current.length > 0) partitions.push(current);
    return partitions;
  }
}
