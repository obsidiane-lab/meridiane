import {Iri, Item} from '@obsidiane/bridge-sandbox';

export function iriOf(entity: Item | null | undefined): Iri {
  return entity?.['@id'];
}

