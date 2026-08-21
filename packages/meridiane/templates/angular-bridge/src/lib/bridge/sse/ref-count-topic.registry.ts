export class RefCountTopicRegistry {
  private readonly refCounts = new Map<string, number>();

  /**
   * Increments ref-count for each topic.
   * Callers should pass unique topic strings (deduped).
   */
  addAll(topics: Iterable<string>): void {
    for (const topic of topics) {
      this.refCounts.set(topic, (this.refCounts.get(topic) ?? 0) + 1);
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
      } else {
        this.refCounts.set(topic, next);
      }
    }
  }

  hasAny(): boolean {
    return this.refCounts.size > 0;
  }

  snapshot(): ReadonlySet<string> {
    return new Set(this.refCounts.keys());
  }
}
