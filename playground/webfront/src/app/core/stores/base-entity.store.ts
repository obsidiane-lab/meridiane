import { computed, signal, type Signal } from '@angular/core';
import type { Iri, Item } from 'bridge';
import type { EntityResource } from '../models/entity-resource.model';
import { iriOf } from '../utils/iri.util';

type EntityResourceIndex<T extends Item> = Record<string, EntityResource<T>>;

export abstract class BaseEntityStore<T extends Item> {
  private readonly resources = signal<EntityResourceIndex<T>>({});
  private readonly idle = signal<EntityResource<T>>({ state: 'idle', value: null }).asReadonly();
  private readonly signals = new Map<Iri, Signal<EntityResource<T>>>();
  private readonly all = computed(() => {
    const entities: T[] = [];

    for (const resource of Object.values(this.resources())) {
      if (resource.value !== null) entities.push(resource.value);
    }

    return entities;
  });

  entity(iri: Iri | undefined): Signal<EntityResource<T>> {
    if (!iri) return this.idle;

    const current = this.signals.get(iri);
    if (current) return current;

    const resource = computed(() => this.resources()[iri] ?? this.idle());
    this.signals.set(iri, resource);

    return resource;
  }

  entities(): Signal<T[]> {
    return this.all;
  }

  setAll(entities: T[]): void {
    const next: EntityResourceIndex<T> = {};
    for (const entity of entities) {
      const iri = iriOf(entity);
      if (iri) next[iri] = { state: 'ready', value: entity };
    }

    this.resources.set(next);
  }

  upsert(entity: T): void {
    const iri = iriOf(entity);
    if (!iri) return;
    this.set(iri, { state: 'ready', value: entity });
  }

  upsertMany(entities: T[]): void {
    this.resources.update((resources) => {
      const next = { ...resources };
      for (const entity of entities) {
        const iri = iriOf(entity);
        if (iri) next[iri] = { state: 'ready', value: entity };
      }

      return next;
    });
  }

  set(iri: Iri | undefined, resource: EntityResource<T>): void {
    if (!iri) return;
    this.resources.update((resources) => ({
      ...resources,
      [iri]: resource,
    }));
  }

  remove(iri: Iri | undefined): void {
    this.set(iri, { state: 'deleted', value: null });
  }

  forget(iri: Iri): void {
    this.resources.update((resources) => {
      const next = { ...resources };
      delete next[iri];

      return next;
    });
  }

  clear(): void {
    this.resources.set({});
  }
}
