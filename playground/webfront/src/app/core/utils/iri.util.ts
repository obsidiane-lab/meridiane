import type { Iri, Item } from 'bridge';

export function iriOf(item?: Item | Iri | null): Iri {
  if (!item) return undefined;
  if (typeof item === 'string') return item as Iri;
  return (item['@id'] as Iri) ?? undefined;
}
