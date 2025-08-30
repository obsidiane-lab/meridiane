import {WritableSignal} from '@angular/core';
import {Item} from '../ports/resource-repository.port';

export function upsertInSignal(
  signal: WritableSignal<readonly Item[]>,
  item: Item,
): void {
  signal.update(items => {

    const id = item['@id'];
    const existingIndex = items.findIndex(it => it['@id'] === id);

    if (existingIndex === -1) {
      return [item, ...items];
    }

    const next = items.slice() as Item[];
    next[existingIndex] = item;
    return next;
  });
}
