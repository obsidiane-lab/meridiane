# Pattern - signal d'entite

## Utilise quand

Page detail, edition, action sur une entite, ou composant qui doit afficher l'etat de chargement/erreur d'une ressource API identifiee par IRI.

## Contrat

Un signal d'entite expose `Signal<EntityResource<T>>`.

```ts
export type EntityResource<T> = {
  state: 'idle' | 'loading' | 'ready' | 'notFound' | 'forbidden' | 'error' | 'deleted';
  value: T | null;
};
```

- `state` pilote l'ecran : skeleton, erreur, ressource absente, acces interdit, suppression ou affichage.
- `value` contient l'entite quand elle est disponible.
- `ready` signifie que la valeur courante est presente et exploitable.
- `loading` peut conserver une ancienne `value` pendant un refresh ; cette valeur est stale. Au premier chargement, elle est generalement `null`.
- `notFound`, `forbidden` et `deleted` doivent etre traites comme des etats sans ressource exploitable.

## Flux standard

```text
composant -> service.$entity(iri) -> repository.$entity(iri) -> store.entity(iri)
repository.fetch$(iri) -> bridge/API -> tap(upsert) -> store { state: ready, value }
component subscription -> service.watchEntity$(iri) -> repository.watch$(iri) -> tap(upsert) -> meme signal mis a jour
```

## Couplage avec Mercure

Ce pattern est le point d'accroche naturel du SSE/Mercure.

- Le fetch initial charge l'entite une seule fois via `$entity(iri)` quand le store est `idle`.
- Le composant detail/edition ouvre ensuite un abonnement borne a `watchEntity$(iri)` ou equivalent.
- Le repository recoit les evenements Mercure, puis fait `tap(entity => store.upsert(entity))`.
- Le store met a jour le meme `EntityResource<T>` en `{ state: 'ready', value: entity }`.
- Le template et tous les composants qui lisent le signal voient la nouvelle valeur sans refetch manuel.
- Un evenement Mercure ne doit pas pousser le composant a recopier la ressource dans un signal local.

Pour une liste paginee AppTable (composition applicative Spartan), l'evenement collection garde le store frais puis declenche un reload de la pagination courante : la liste affichee reste la reponse AppTable. Pour une page detail/edition par IRI, privilegier la mise a jour du signal d'entite par `watch$` plutot qu'un nouveau fetch.

## Store

- Source reactive locale des `EntityResource<T>` connues par IRI.
- Index par `@id`/IRI.
- Expose `entity(iri)` sous forme de signal memoise.
- Expose `entities()` comme liste derivee des valeurs non nulles.
- Ne fait aucun HTTP, aucune navigation, aucune injection de service metier.

## Repository

- Retourne immediatement le signal du store via `$entity(iri)`.
- Si le signal est `idle` et que l'IRI existe, lance le fetch.
- Avant l'appel HTTP, met le store en `{ state: 'loading', value: current.value }`.
- Sur succes, fait `tap(entity => store.upsert(entity))`, ce qui met `{ state: 'ready', value: entity }`.
- Sur erreur, traduit l'erreur technique en etat de ressource (`notFound`, `forbidden`, `error`) et synchronise le store.
- Les evenements SSE/Mercure passent aussi par le repository et finissent par mettre a jour le store avec le meme `upsert`.

## Service

- Expose les signaux dans le vocabulaire de la feature, par exemple `$resource(iri)`.
- Peut etre un simple relais vers le repository.
- Compose plusieurs signaux ou ajoute une orchestration seulement si une vraie logique de feature existe.
- Ne doit pas recopier inutilement un signal d'entite dans un signal local.

## Composant

- Recupere le signal expose par le service.
- Lit directement le signal dans le template.
- Utilise `state` pour choisir l'etat d'ecran.
- Lit `value` directement dans le bloc `ready`, sans recopier l'entite dans un autre signal.

```html
@let state = resource();

@switch (state.state) {
  @case ('loading') {
    <div class="grid gap-3" aria-hidden="true">
      <div hlmSkeleton class="h-8 w-full"></div>
      <div hlmSkeleton class="h-20 w-full"></div>
    </div>
  }

  @case ('error') {
    <div hlmAlert variant="destructive">
      <p hlmAlertTitle>Chargement impossible</p>
      <p hlmAlertDescription>Reessayez dans quelques instants.</p>
    </div>
  }

  @case ('ready') {
    @if (state.value; as item) {
      <h1>{{ item.name }}</h1>
      <p>{{ item.description }}</p>
    }
  }
}
```

## Anti-patterns

Store qui appelle le service ou le bridge, composant qui appelle le repository, copie de `resource.value` dans un signal local pour affichage simple, booleens `loading/error` separes pour une entite deja modelisee par `EntityResource`, lecture de `value` sans garde `ready`, fetch lance depuis le template, refetch manuel a chaque evenement Mercure, service qui transforme inutilement le signal sans logique de feature.
