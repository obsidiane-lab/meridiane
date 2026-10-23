# Recette - CRUD fullstack

## Quand utiliser

Nouvelle entite visible, liste, detail, creation, edition, suppression ou backoffice simple.

## Lire d'abord

1. `core/AGENTS.md`
2. `webfront/AGENTS.md`
3. le skill technique `spartan`
4. `.codex/patterns/backend/entity-api-resource.md` ou `.codex/patterns/backend/dto-api-resource.md`
5. `.codex/patterns/frontend/store-repository-service-component.md`
6. `.codex/patterns/frontend/entity-resource-signal.md`
7. `webfront/docs/ui/forms.md` ; `.codex/patterns/frontend/reactive-form.md` seulement si Reactive Forms est retenu
8. `.codex/patterns/realtime/sse-mercure.md`
9. exemple : `.codex/examples/resource-crud-stack.md`

Ne pas lire `docs/project/` sauf si la feature touche une capacite structurante ou si l'utilisateur demande une mise a jour produit durable.

## Pattern a appliquer

Backend :

- Entity `ApiResource` si CRUD interne/backoffice simple et proche du modele Doctrine.
- DTO `ApiResource` si contrat public, stable, sensible, divergent, read/write asymetrique ou projection.
- Squelette backend : privilegier `php bin/console make:*` quand MakerBundle couvre le besoin, puis adapter aux operations, au contrat et a la securite Foundation.
- Relations par IRI par defaut.
- Provider/processor seulement avec valeur reelle.
- Schema modifie : generer la migration avec `php bin/console d:m:diff`, relire le SQL, adapter seulement si necessaire.

Frontend :

- `store -> repository -> service -> composant`.
- Squelette Angular : privilegier `ng generate` ou `npm run ng -- generate` pour les artefacts supportes, puis adapter aux emplacements et conventions Foundation.
- Store indexe par IRI, sans HTTP.
- Repository = bridge + HTTP/RxJS/SSE + sync store.
- Service = vocabulaire feature, actions et signals.
- Signal d'entite = `EntityResource<T>` ; `state` pilote l'ecran, `ready` garantit `value`.
- Composant = UI, navigation, formulaire, table, abonnements bornes, lecture directe des signaux d'entite.
- Formulaire create/edit = logique dediee dans `forms/*.form.ts` ; Signal Forms si compatible, ou `FormType` avec champs, validators, reset et payload si Reactive Forms est requis.
- UI = composition des primitives Spartan et des compositions applicatives Foundation ; aucune edition manuelle de `webfront/src/app/shared/ui/**`.
- Temps reel detail/edition = fetch initial via signal d'entite, puis `watch$` Mercure met a jour le meme store sans refetch manuel.

## Parcours CRUD attendu

- Liste : page avec AppTable (composition applicative Spartan) -> service `fetchAll$` -> repository `fetchAll$` -> bridge `getCollection$` -> `store.upsertMany(collection.member)` -> collection rendue par AppTable. AppTable garde son propre etat local ; `watchCollection$` ecoute la ressource (bridge `watch$()` sans IRI, URL Pattern `{url}/:id`), garde le store frais avec `store.upsert`, puis la page relance `table.reload()` sur la pagination courante.
- Detail : page derive l'IRI -> service `$resource(iri)` -> repository `$entity(iri)` -> store `EntityResource<T>` ; si `idle`, fetch initial silencieux ; `watch$(iri)` met ensuite le meme signal a jour via Mercure.
- Creation : page/form appelle `service.create(payload)` -> repository `create$` -> bridge `post$` -> backend persiste -> API Platform publie Mercure. Si une AppTable est visible, `watchCollection$` applique `store.upsert` puis declenche `table.reload()` ; si une page detail/edit ecoute l'item, `watch$(iri)` applique `store.upsert`. La reponse HTTP sert a l'UX immediate, a recuperer l'IRI creee ou a naviguer, pas a synchroniser le store en flux realtime.
- Edition : page/form hydrate depuis `$entity(iri)`, appelle `service.update(iri, payload)` -> repository `update$` -> bridge `patch$` -> backend persiste -> Mercure publie -> `watch$(iri)` applique `store.upsert`.
- Suppression : page confirme -> `service.delete(iri)` -> repository `delete$` -> bridge `delete$` -> `store.remove(iri)` ; ne pas attendre un event delete. Un event delete recu par `watch$` (`isResourceDeletion`) applique aussi `store.remove`.

Garde-fous :
- Backend = source persistante ; store = source reactive des entites connues ; AppTable = source locale de la vue paginee courante ; Mercure = canal de synchronisation.
- Les events Mercure ecoutes par `watchCollection$` doivent porter une entite upsertable avec `@id`. Si le payload est custom, adapter explicitement le repository.
- Eviter d'etendre la documentation durable : cette recette est la verite operationnelle Codex pour les CRUD standards.

## Fichiers probables

- `core/src/Entity/<Name>.php` ou `core/src/ApiResource/<Name>.php`
- `core/src/Repository/<Name>Repository.php`
- migration Doctrine generee via `php bin/console d:m:diff` si schema modifie
- `webfront/src/app/modules/<module>/stores/<name>.store.ts`
- `webfront/src/app/modules/<module>/repositories/<name>.repository.ts`
- `webfront/src/app/modules/<module>/services/<name>.service.ts`
- `webfront/src/app/modules/<module>/forms/<name>.form.ts`
- pages et composants de formulaire/table
- routes/menu/i18n si visible

## Checks

- `make phpstan` si backend touche.
- migration via `php bin/console d:m:diff` si schema modifie.
- `make bridge` si contrat visible change.
- `make lint && make build` si frontend touche.

## Documentation durable seulement si

Le CRUD introduit une convention reutilisable, une regle metier durable, un contrat public structurant, une strategie de securite nouvelle ou une strategie SSE nouvelle. Sinon : `Documentation durable : non necessaire`.

## Anti-patterns

- Type frontend local qui duplique un modele bridge.
- `HttpClient` dans un composant.
- Modification manuelle de `webfront/bridge/`.
- Provider/processor pass-through.
- Voter vide.
- Embed de relation pour eviter un chargement par IRI.
