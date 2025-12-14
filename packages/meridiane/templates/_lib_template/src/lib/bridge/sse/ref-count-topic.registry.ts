export class RefCountTopicRegistry {
  private readonly topics = new Set<string>();
  private readonly refCounts = new Map<string, number>();

  /**
   * Increments ref-count for each topic.
   * Callers should pass unique topic strings (deduped).
   */
  addAll(topics: Iterable<string>): void {
    for (const topic of topics) {
      const next = (this.refCounts.get(topic) ?? 0) + 1;
      this.refCounts.set(topic, next);
      this.topics.add(topic);
    }
  }

  /**
   * Decrements ref-count for each topic.
   * Callers should pass unique topic strings (deduped).
   */
  removeAll(topics: Iterable<string>): void {
    for (const topic of topics) {
      const next = (this.refCounts.get(topic) ?? 0) - 1;
      if (next <= 0) {
        this.refCounts.delete(topic);
        this.topics.delete(topic);
      } else {
        this.refCounts.set(topic, next);
      }
    }
  }

  hasAny(): boolean {
    return this.topics.size > 0;
  }

  snapshot(): ReadonlySet<string> {
    return new Set(this.topics);
  }

  computeKey(hubUrl: string, credentialsOn: boolean): string {
    const topicsSorted = Array.from(this.topics).sort().join('|');
    return `${hubUrl}::${credentialsOn ? '1' : '0'}::${topicsSorted}`;
  }
}
