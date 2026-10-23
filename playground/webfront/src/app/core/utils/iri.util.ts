import type { Iri, Item } from 'bridge';

export function iriOf(item?: Item | Iri | null): Iri | undefined {
  if (!item) return undefined;
  if (typeof item === 'string') return item;
  return item['@id'];
}
