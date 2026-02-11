export type NewWatchSubscriptionInput = {
  name: string;
  topic: string;
  typesInput: string;
  discriminator: string;
  newConnection: boolean;
};

export type NewWatchSubscription = {
  name: string;
  topic: string;
  typesInput: string;
  discriminator: string;
  newConnection: boolean;
};

export type PlanSingleInput = NewWatchSubscriptionInput;

export type PlanBulkInput = {
  topicPrefix: string;
  count: number;
  typesInput: string;
  discriminator: string;
  newConnection: boolean;
  confirmLargeBatch: boolean;
  existingTopics: Set<string>;
  currentTotal: number;
  maxSubscriptions: number;
  largeBatchThreshold: number;
};

export type PlanBulkResult =
  | { ok: true; entries: NewWatchSubscription[]; skippedDuplicates: number }
  | { ok: false; error: string };

export type PlanSingleResult =
  | { ok: true; entries: NewWatchSubscription[] }
  | { ok: false; error: string };

export function parseTypes(raw: string): string[] {
  return Array.from(
    new Set(
      String(raw ?? '')
        .split(/[,\n]/g)
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
    )
  );
}

export function normalizeTopic(raw: string): string {
  const topic = String(raw ?? '').trim();
  if (topic.length === 0) return '';
  return topic.endsWith('/') && topic !== '/' ? topic.slice(0, -1) : topic;
}

export function planSingleSubscription(input: PlanSingleInput): PlanSingleResult {
  const topic = normalizeTopic(input.topic);
  const types = parseTypes(input.typesInput);
  const discriminator = String(input.discriminator ?? '').trim() || '@type';
  const name = String(input.name ?? '').trim();

  if (!topic || types.length === 0) {
    return { ok: false, error: 'Subscription invalide: topic requis et au moins un type requis.' };
  }

  const entry: NewWatchSubscription = {
    name: name || 'sub',
    topic,
    typesInput: types.join(', '),
    discriminator,
    newConnection: input.newConnection,
  };

  return { ok: true, entries: [entry] };
}

export function planBulkSubscriptions(input: PlanBulkInput): PlanBulkResult {
  const topicPrefix = String(input.topicPrefix ?? '').trim();
  const count = Math.floor(input.count);
  const discriminator = String(input.discriminator ?? '').trim() || '@type';
  const types = parseTypes(input.typesInput);

  if (!topicPrefix || types.length === 0 || count < 1) {
    return { ok: false, error: 'Bulk invalide: prefix, count>=1 et types requis.' };
  }

  if (count > input.largeBatchThreshold && !input.confirmLargeBatch) {
    return {
      ok: false,
      error: `Ajout en lot > ${input.largeBatchThreshold} bloque: coche "Confirmer lot > ${input.largeBatchThreshold}" pour eviter un ajout accidentel.`,
    };
  }

  const maxAvailable = input.maxSubscriptions - input.currentTotal;
  if (maxAvailable <= 0) {
    return { ok: false, error: `Limite atteinte (${input.maxSubscriptions} subscriptions max).` };
  }

  const entries: NewWatchSubscription[] = [];
  let skippedDuplicates = 0;
  const seenTopics = new Set(input.existingTopics);

  for (let i = 1; i <= count; i++) {
    if (entries.length >= maxAvailable) break;

    const topic = normalizeTopic(`${topicPrefix}${i}`);
    if (!topic || seenTopics.has(topic)) {
      skippedDuplicates += 1;
      continue;
    }

    seenTopics.add(topic);
    entries.push({
      name: `bulk-${i}`,
      topic,
      typesInput: types.join(', '),
      discriminator,
      newConnection: input.newConnection,
    });
  }

  if (entries.length === 0) {
    return { ok: false, error: 'Aucune subscription ajoutee (topics deja existants ou limite atteinte).' };
  }

  return { ok: true, entries, skippedDuplicates };
}
