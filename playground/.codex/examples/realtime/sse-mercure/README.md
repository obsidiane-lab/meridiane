# Exemple - SSE/Mercure et signal d'entite

Squelette generique pour un CRUD visible avec detail/edition par IRI.

## Repository

Le repository expose le signal d'entite et le flux Mercure. Les deux synchronisent le meme store.

```ts
$entity(iri: Iri): Signal<EntityResource<Resource>> {
  const sig = this.store.entity(iri);
  if (sig().state === 'idle' && iri) {
    this.fetch$(iri).subscribe({ error: () => undefined });
  }
  return sig;
}

fetch$(iri: Iri): Observable<Resource> {
  const current = this.store.entity(iri)();
  this.store.set(iri, { state: 'loading', value: current.value });

  return this.facade.get$(iri).pipe(
    tap((resource) => this.store.upsert(resource)),
  );
}

watch$(topicIri: Iri): Observable<Resource> {
  return this.facade.watch$(topicIri).pipe(
    tap((resource) => this.store.upsert(resource)),
  );
}
```

Le fetch initial remplit le store une fois. Ensuite, chaque evenement Mercure met a jour le meme `EntityResource<T>` via `upsert`.

## Service

Le service donne le vocabulaire feature.

```ts
$resource(iri: Iri): Signal<EntityResource<Resource>> {
  return this.repo.$entity(iri);
}

watchResource$(resourceIri: Iri): Observable<Resource> {
  return this.repo.watch$(resourceIri);
}
```

## Composant

Le composant lit le signal dans le template et garde l'abonnement Mercure borne au cycle de vie.

```ts
protected readonly resource = this.resourceService.$resource(this.resourceIri);

public constructor() {
  if (!this.resourceIri) return;

  this.resourceService.watchResource$(this.resourceIri)
    .pipe(takeUntilDestroyed())
    .subscribe();
}
```

```html
@let state = resource();

@switch (state.state) {
  @case ('ready') {
    @if (state.value; as item) {
      <h1>{{ item.name }}</h1>
    }
  }
}
```

## Regle d'imitation

Le composant ne manipule pas `EventSource` directement et ne refetch pas l'entite a chaque evenement. Mercure passe par le repository, le repository met le store a jour, et le signal d'entite reactive l'interface.

Pour une liste paginee AppTable (composition applicative Spartan), `watchCollection$` garde le store frais puis declenche un reload de la pagination courante. La liste AppTable reste rendue depuis la reponse paginee de la table.
