import {Iri} from '../ports/resource-repository.port';

export function toIriList(input: Iri | Iri[]): string[] {
  const values = Array.isArray(input) ? input : [input];
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0);
}
