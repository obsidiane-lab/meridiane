# Exemple - CRUD ressource

Cet exemple decrit la forme attendue d'un CRUD Foundation sans imposer de domaine metier.

## Backend

- Entite CRUD interne : `core/src/Entity/<Resource>.php`.
- Repository Doctrine : `core/src/Repository/<Resource>Repository.php`.
- Processor/Voter custom : seulement si une vraie regle metier, ownership ou effet de bord le justifie.

## Frontend

- Store : `webfront/src/app/modules/<module>/stores/<resource>.store.ts`.
- Repository : `webfront/src/app/modules/<module>/repositories/<resource>.repository.ts`.
- Service : `webfront/src/app/modules/<module>/services/<resource>.service.ts`.
- Formulaire : `webfront/src/app/modules/<module>/forms/<resource>.form.ts` et `components/<resource>-form/`.
- Pages : `<resource>-create-page`, `<resource>-detail-page`, `<resource>-edit-page`, `<resources>-page`.

## Ce que Codex doit imiter

- Separation stricte des couches frontend.
- Contrat backend corrige avant bridge.
- Pages fines autour du service.
- Signaux d'entite `EntityResource<T>` consommes directement par les pages detail/edition.
- Form class dediee pour create/edit.
- Strategie SSE/Mercure explicite pour CRUD visible.
- Relations par IRI si une ressource liee apparait.

## Parcours CRUD a imiter

```text
liste:
  page AppTable (composition applicative Spartan) -> service.fetchAll$ -> repository.fetchAll$ -> bridge.getCollection$ -> store.upsertMany -> Collection<T>
  AppTable garde page/filtres/tri/loading/reponse courante
  URL Pattern de la ressource -> repository.watchCollection$ -> store.upsert -> table.reload() sur la pagination courante

detail:
  page -> service.$resource(iri) -> repository.$entity(iri) -> store.entity(iri)
  si idle -> repository.fetch$(iri) -> bridge.get$ -> store.upsert
  topic item -> repository.watch$(iri) -> store.upsert -> signal UI

creation:
  page/form -> service.create(payload) -> repository.create$ -> bridge.post$ -> backend persiste
  API Platform -> Mercure topic item (URL Pattern de la ressource) -> repository.watchCollection$ -> store.upsert -> table.reload() si liste visible
  API Platform -> Mercure topic item -> repository.watch$(iri) -> store.upsert -> signal UI si detail/edit visible

edition:
  page/form hydrate via $entity(iri)
  service.update(iri, payload) -> repository.update$ -> bridge.patch$ -> backend persiste
  API Platform -> Mercure topic item -> repository.watch$(iri) -> store.upsert -> signal UI

suppression:
  service.delete(iri) -> repository.delete$ -> bridge.delete$
  repository.delete$ -> store.remove(iri) ; un event delete Mercure (isResourceDeletion) -> store.remove(iri)
```

En flux realtime, `create$` et `update$` ne font pas `store.upsert` depuis la reponse HTTP. Les pages detail/edit sont mises a jour par l'evenement item Mercure. Les listes AppTable rendent la reponse paginee de la table ; l'evenement collection garde le store frais puis relance la pagination courante.

## Ce que Codex ne doit pas imiter aveuglement

- Ne pas transformer tout contrat en Entity `ApiResource` si le contrat devient public, sensible ou divergent.
- Ne pas creer de fiche documentaire pour chaque CRUD derive.
- Ne pas ajouter provider, processor, voter ou DTO pass-through.
