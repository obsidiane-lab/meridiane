import {Subject} from 'rxjs';

export interface SubscriptionClaim {
  id: string;
  topicsKey: string;
  stop$: Subject<void>;
}

/** Tracks active subscriptions and preserves FIFO `unsubscribe(topics)` semantics. */
export class SubscriptionClaims<T extends SubscriptionClaim> {
  private readonly claims = new Map<string, T>();
  private readonly queueByTopics = new Map<string, string[]>();

  get size(): number {
    return this.claims.size;
  }

  add(claim: T): void {
    this.claims.set(claim.id, claim);
    const queue = this.queueByTopics.get(claim.topicsKey) ?? [];
    queue.push(claim.id);
    this.queueByTopics.set(claim.topicsKey, queue);
  }

  release(claimId: string): T | undefined {
    const claim = this.claims.get(claimId);
    if (!claim) return undefined;

    this.claims.delete(claimId);
    this.removeFromQueue(claim);
    return claim;
  }

  stopNext(topicsKey: string): boolean {
    const queue = this.queueByTopics.get(topicsKey);
    while (queue?.length) {
      const claimId = queue[0];
      if (this.stop(claimId)) return true;
      queue.shift();
    }

    this.queueByTopics.delete(topicsKey);
    return false;
  }

  stopAll(): void {
    for (const claimId of [...this.claims.keys()]) this.stop(claimId);
  }

  clear(): void {
    this.claims.clear();
    this.queueByTopics.clear();
  }

  private stop(claimId: string): boolean {
    const claim = this.claims.get(claimId);
    if (!claim) return false;

    claim.stop$.next();
    claim.stop$.complete();
    return true;
  }

  private removeFromQueue(claim: T): void {
    const queue = this.queueByTopics.get(claim.topicsKey);
    if (!queue) return;

    const remaining = queue.filter((claimId) => claimId !== claim.id);
    if (remaining.length > 0) this.queueByTopics.set(claim.topicsKey, remaining);
    else this.queueByTopics.delete(claim.topicsKey);
  }
}

export function topicsKey(topics: Iterable<string>): string {
  return [...new Set(topics)].sort().join('|');
}
