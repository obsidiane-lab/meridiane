import { computed, signal, type Signal, type WritableSignal } from '@angular/core';
import type { Iri, Item } from 'bridge';
import type { EntityResource } from '../models/entity-resource.model';
import { iriOf } from '../utils/iri.util';

/**
 * Stockage des entités connues : une ligne par IRI, chaque ligne est un signal.
 * Le même IRI rend toujours le même signal, lu tel quel par les composants.
 * Le store ne fait que stocker : chargement, HTTP et temps réel restent dans le repository.
 */
export abstract class BaseEntityStore<T extends Item> {
  private readonly rows = new Map<Iri, WritableSignal<EntityResource<T>>>();
  /** IRI des lignes écrites ; une ligne seulement lue (idle) n'y figure pas. */
  private readonly keys = signal<readonly Iri[]>([]);
  private readonly idle = signal<EntityResource<T>>({ state: 'idle', value: null }).asReadonly();
  private readonly all = computed(() =>
    this.keys().flatMap((iri) => {
      const value = this.rows.get(iri)?.().value;
      return value ? [value] : [];
    }),
  );

  entity(iri: Iri | undefined): Signal<EntityResource<T>> {
    return iri ? this.row(iri).asReadonly() : this.idle;
  }

  entities(): Signal<T[]> {
    return this.all;
  }

  set(iri: Iri | undefined, resource: EntityResource<T>): void {
    if (!iri) return;
    this.row(iri).set(resource);
    if (!this.keys().includes(iri)) this.keys.update((keys) => [...keys, iri]);
  }

  upsert(entity: T): void {
    this.set(iriOf(entity), { state: 'ready', value: entity });
  }

  upsertMany(entities: T[]): void {
    for (const entity of entities) this.upsert(entity);
  }

  /** Remplace les entités connues ; les lignes absentes repassent à `idle` (leurs signaux restent valides). */
  setAll(entities: T[]): void {
    this.clear();
    this.upsertMany(entities);
  }

  remove(iri: Iri | undefined): void {
    this.set(iri, { state: 'deleted', value: null });
  }

  forget(iri: Iri): void {
    this.rows.get(iri)?.set({ state: 'idle', value: null });
    this.keys.update((keys) => keys.filter((key) => key !== iri));
  }

  clear(): void {
    for (const iri of this.keys()) this.rows.get(iri)?.set({ state: 'idle', value: null });
    this.keys.set([]);
  }

  /** Crée la ligne à la première lecture : sans écriture de signal, donc lisible depuis un template ou un `computed`. */
  private row(iri: Iri): WritableSignal<EntityResource<T>> {
    let row = this.rows.get(iri);
    if (!row) {
      row = signal<EntityResource<T>>({ state: 'idle', value: null });
      this.rows.set(iri, row);
    }
    return row;
  }
}
