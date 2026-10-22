# Pattern - SSE / Mercure

## Utilise quand

CRUD visible, besoin temps reel, refresh automatique, topic Mercure ou `EventSource`.

## Squelette mental

Backend : topics Mercure declaratifs quand API Platform suffit.

Repository : RxJS + SSE, avec `watch$` pour alimenter le store d'entite et `watchCollection$` pour upsert l'entite recue puis declencher le reload d'AppTable (composition applicative Spartan).

Service : API metier et signals derives.

Composant : abonnement borne au cycle de vie, reload table si collection paginee.

## Couplage avec les signaux d'entite

Approche recommandee : entity-driven. Une entite API Platform exposee au frontend est utilisee via son type bridge et ses relations IRI. Quand l'UI affiche ou edite cette entite par IRI, elle ouvre un `watch$(iri)` ; Mercure alimente alors le meme store que le fetch HTTP. Backend = source persistante ; store = source reactive des entites connues ; AppTable = source locale de la vue paginee courante ; Mercure = canal de synchronisation.

- Detail/edition par IRI : `$entity(iri)` fait le fetch initial si le store est `idle`, puis `watch$(iri)` met a jour le store sur chaque evenement.
- Le repository applique les evenements avec `tap(entity => store.upsert(entity))`.
- Create/update/patch : le repository persiste via le bridge, puis attend l'event Mercure publie par le backend pour appliquer `store.upsert`.
- La reponse HTTP de commande peut servir a naviguer, afficher un etat `saved` ou recuperer l'IRI creee, mais pas a masquer un flux Mercure absent ni a remplir le store en flux realtime standard.
- Le composant lit toujours le meme `Signal<EntityResource<T>>`; le template se met a jour quand le store passe en `ready` avec la nouvelle `value`.
- Ne pas refetch l'entite a chaque evenement Mercure si l'evenement contient deja la ressource necessaire au store.
- Liste paginee AppTable : `watchCollection$` fait `store.upsert` pour garder les entites connues a jour, puis la page appelle `table.reload()` ; AppTable recharge sa page courante avec ses filtres/tri et ne rend pas la liste depuis le store.
- Payload collection AppTable : entite upsertable avec `@id`. Si le payload est custom, mapper explicitement avant d'appliquer ce pattern.
- Delete reste un cas local : apres DELETE, `store.remove(iri)` ; l'abonnement se libere avec `unsubscribe()`. Un event delete recu (`isResourceDeletion`) applique aussi `store.remove(iri)`.

## Strategie obligatoire pour CRUD visible

Par defaut, choisir le temps reel entity-driven :

- topic item pour chaque entite affichee/editee par IRI ;
- URL Pattern de la ressource (`watch$()` sans IRI) pour les listes AppTable qui doivent recharger leur pagination courante ;
- refresh manuel ou `non necessaire` seulement avec justification explicite.

## Checks

`make phpstan` si backend ; `make build` si frontend ; test/review du cycle abonnement si possible.

## Anti-patterns

Abonnement non nettoye, logique SSE dans composant, `store.upsert` direct depuis `create$`/`update$` alors que Mercure est la strategie realtime, refetch manuel de l'entite a chaque evenement alors que le payload permet `store.upsert`, topic trop large, fuite de donnees par topic public, reload infini.
