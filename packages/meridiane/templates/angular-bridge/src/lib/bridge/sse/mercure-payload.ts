import {BridgeLogger} from '../../bridge.types';
import {SubscribeFilter} from '../../ports/realtime.port';
import {Item} from '../../ports/resource-repository.port';
import {MercureTopicMapper} from './mercure-topic.mapper';

export function parseMercurePayload(raw: string, logger?: BridgeLogger): Item | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) ? value as Item : undefined;
  } catch {
    logger?.debug?.('[Mercure] invalid JSON payload ignored', {raw});
    return undefined;
  }
}

export function createPayloadTopicMatcher(
  iris: string[],
  filter: SubscribeFilter | undefined,
  topicMapper: MercureTopicMapper
): (payload: Item) => string | undefined {
  const subscribedTopics = iris.map((iri) => normalizeIri(topicMapper.toPayloadIri(iri)));
  const fieldPaths = [
    ...(filter?.fields?.filter((field): field is string => typeof field === 'string' && field.length > 0) ?? []),
    ...(typeof filter?.field === 'string' && filter.field.length > 0 ? [filter.field] : []),
  ];
  const includeSelf = filter?.includeSelf ?? fieldPaths.length === 0;

  return (payload) => {
    for (const fieldPath of fieldPaths) {
      const relationIris = readRelationIris(payload, fieldPath)
        .map((iri) => normalizeIri(topicMapper.toPayloadIri(iri)));
      for (const relationIri of relationIris) {
        const match = findClosestTopic(relationIri, subscribedTopics);
        if (match) return match;
      }
    }

    if (!includeSelf) return undefined;

    const payloadIri = payload['@id'];
    if (typeof payloadIri !== 'string') return undefined;
    return findClosestTopic(normalizeIri(topicMapper.toPayloadIri(payloadIri)), subscribedTopics);
  };
}

function readRelationIris(payload: Item, path: string): string[] {
  const value = path
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((current, key) => isIndexable(current) ? current[key] : undefined, payload);

  return extractIris(value);
}

function extractIris(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string') return value.length > 0 ? [value] : [];
  if (isIndexable(value) && typeof value['@id'] === 'string') return [value['@id']];
  if (Array.isArray(value)) return value.flatMap(extractIris);
  return [];
}

function findClosestTopic(candidate: string, subscribedTopics: string[]): string | undefined {
  let closest: string | undefined;
  for (const topic of subscribedTopics) {
    if (candidate !== topic && !candidate.startsWith(`${topic}/`)) continue;
    if (!closest || topic.length > closest.length) closest = topic;
  }
  return closest;
}

function normalizeIri(iri: string): string {
  return iri.endsWith('/') ? iri.slice(0, -1) : iri;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isIndexable(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}
