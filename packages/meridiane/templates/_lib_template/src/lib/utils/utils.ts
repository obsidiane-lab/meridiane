import {WritableSignal} from '@angular/core';
import {Item} from '../ports/resource-repository.port';

/** Inserts or replaces an `Item` in a signal list based on its `@id`. */
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
