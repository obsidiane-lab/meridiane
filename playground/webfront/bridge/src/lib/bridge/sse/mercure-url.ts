import type {MercureSubscription} from '../../ports/realtime.port';

const MATCH_PARAMETER: Record<MercureSubscription['type'], string> = {
  exact: 'match',
  urlpattern: 'match_urlpattern',
};

/**
 * Builds a Mercure 1.0 subscribe URL: one `match` / `match_urlpattern` parameter per subscription,
 * plus `last_event_id` to resume from the last received update (browsers cannot set the
 * `Last-Event-ID` header on the first request).
 */
export function buildSubscribeUrl(
  hubUrl: string,
  subscriptions: Iterable<MercureSubscription>,
  lastEventId?: string
): string {
  const url = new URL(hubUrl);
  for (const subscription of subscriptions) {
    url.searchParams.append(MATCH_PARAMETER[subscription.type], subscription.match);
  }
  if (lastEventId) url.searchParams.set('last_event_id', lastEventId);
  return url.toString();
}

export function subscriptionKey(subscription: MercureSubscription): string {
  return `${subscription.type} ${subscription.match}`;
}
