export class RefCountTopicRegistry {
  private readonly iris = new Set<string>();
  private readonly refCounts = new Map<string, number>();


  addAll(iris: Iterable<string>): void {
    for (const iri of iris) {
      const next = (this.refCounts.get(iri) ?? 0) + 1;
      this.refCounts.set(iri, next);
      this.iris.add(iri);
    }
  }


  removeAll(iris: Iterable<string>): void {
    for (const iri of iris) {
      const next = (this.refCounts.get(iri) ?? 0) - 1;
      if (next <= 0) {
        this.refCounts.delete(iri);
        this.iris.delete(iri);
      } else {
        this.refCounts.set(iri, next);
      }
    }
  }


  hasAny(): boolean {
    return this.iris.size > 0;
  }


  snapshot(): ReadonlySet<string> {
    return new Set(this.iris);
  }



  computeKey(hubUrl: string, credentialsOn: boolean): string {
    const topicsSorted = Array.from(this.iris).sort().join('|');
    return `${hubUrl}::${credentialsOn ? '1' : '0'}::${topicsSorted}`;
  }
}
