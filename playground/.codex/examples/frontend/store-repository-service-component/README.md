# Exemple - Store -> repository -> service -> composant

Squelette generique pour une ressource exposee par IRI.

## Store

Le store est une memoire reactive par IRI. Il ne connait ni HTTP, ni bridge, ni service.

```ts
@Injectable({ providedIn: 'root' })
export class ResourceStore extends BaseEntityStore<Resource> {}
```

`BaseEntityStore` expose :

- `entity(iri): Signal<EntityResource<T>>`
- `entities(): Signal<T[]>`
- `set(iri, resource)`
- `upsert(entity)` qui met `{ state: 'ready', value: entity }`
- `remove(iri)` qui met `{ state: 'deleted', value: null }`

## Repository

Le repository parle au bridge et synchronise le store.

```ts
@Injectable({ providedIn: 'root' })
export class ResourceRepository {
  private readonly store = inject(ResourceStore);
  private readonly facade = inject(FacadeFactory).create<Resource>({ url: '/api/resources' });

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
      catchError((error) => {
        this.store.set(iri, this.fetchFailureResource(error, current.value));
        return throwError(() => error);
      }),
    );
  }
}
```

`loading` peut conserver `current.value` pendant un refresh : cette valeur est stale. Au premier fetch, elle est generalement `null`.

## Service

Le service expose le vocabulaire de la feature. Il peut simplement relayer le signal si aucune composition n'est necessaire.

```ts
@Injectable({ providedIn: 'root' })
export class ResourceService {
  private readonly repo = inject(ResourceRepository);

  $resource(iri: Iri): Signal<EntityResource<Resource>> {
    return this.repo.$entity(iri);
  }
}
```

## Composant

Le composant recupere le signal via le service et le template lit directement `state` et `value`.

```ts
export class ResourceDetailPageComponent {
  private readonly resourceService = inject(ResourceService);
  protected readonly resource = this.resourceService.$resource(this.resourceIri);
}
```

```html
@let state = resource();

@switch (state.state) {
  @case ('loading') {
    <div class="grid gap-3" aria-hidden="true">
      <div hlmSkeleton class="h-8 w-full"></div>
      <div hlmSkeleton class="h-20 w-full"></div>
    </div>
  }

  @case ('ready') {
    @if (state.value; as item) {
      <h1>{{ item.name }}</h1>
    }
  }
}
```

## Regle d'imitation

Appliquer les invariants Spartan de `webfront/AGENTS.md` pour l'interface. Garder la direction : composant -> service -> repository -> bridge/store. Le store ne connait pas le backend ; le composant ne connait pas le bridge.
