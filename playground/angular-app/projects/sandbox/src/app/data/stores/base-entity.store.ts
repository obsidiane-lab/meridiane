import {computed, Signal, signal} from '@angular/core';
import {Iri, Item} from '@obsidiane/bridge-sandbox';
import {iriOf} from '../../core/utils/iri.util';

export abstract class BaseEntityStore<T extends Item> {
  protected readonly _list = signal<readonly T[]>([]);
  private readonly readonlyList = this._list.asReadonly();

  entity(iri: Iri): Signal<T | undefined> {
    return computed(() => this.readonlyList().find((e) => iriOf(e) === iri));
  }

  entities(): Signal<readonly T[]> {
    return this.readonlyList;
  }

  setAll(entities: readonly T[]): void {
    this._list.set([...entities]);
  }

  upsert(entity: T): void {
    const id = iriOf(entity);
    if (!id) return;

    this._list.update((list) => {
      const idx = list.findIndex((e) => iriOf(e) === id);
      if (idx === -1) return [...list, entity];
      const next = list.slice() as T[];
      next[idx] = entity;
      return next;
    });
  }

  upsertMany(entities: readonly T[]): void {
    this._list.update((list) => {
      const map = new Map(
        list.flatMap((e) => {
          const id = iriOf(e);
          return id ? ([[id, e]] as const) : [];
        }),
      );

      for (const e of entities) {
        const id = iriOf(e);
        if (id) map.set(id, e);
      }
      return Array.from(map.values());
    });
  }

  remove(iri: Iri): void {
    if (!iri) return;
    this._list.update((list) => list.filter((e) => iriOf(e) !== iri));
  }

  clear(): void {
    this._list.set([]);
  }
}
