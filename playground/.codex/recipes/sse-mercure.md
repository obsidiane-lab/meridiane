# Recette - SSE / Mercure / temps reel

## Quand utiliser

SSE, Mercure, `EventSource`, `watch$`, `watchCollection$`, topic, refresh live, notification ou CRUD visible avec temps reel.

## Lire d'abord

1. `.codex/patterns/realtime/sse-mercure.md`
2. `.codex/patterns/frontend/entity-resource-signal.md` si une entite par IRI est affichee
3. la configuration `provideBridge` (`mercure.authorize`) dans `webfront/src/app/app.config.ts`
4. le repository de feature le plus proche
5. `core/docs/api/auth.md` ou `webfront/docs/standards/auth.md` seulement si auth/session Mercure change

## Pattern a appliquer

- Backend : declarer les topics Mercure sur la ressource quand API Platform suffit.
- Frontend repository : expose `watch$` pour sync store d'entite et `watchCollection$` pour upsert l'entite recue puis signaler un reload d'AppTable (composition applicative Spartan).
- Detail/edition : faire le fetch initial via `$entity(iri)`, puis laisser `watch$(iri)` mettre a jour le meme signal par `store.upsert`.
- Create/update/patch : persister via HTTP, puis laisser l'event Mercure alimenter le store ; la reponse HTTP sert a l'UX immediate, pas a synchroniser le store dans le flux realtime standard.
- Service : expose une methode metier ou un signal derive.
- Composant : abonnement local borne, reload table si liste paginee.
- Documenter `non necessaire` uniquement dans la sortie finale si aucun temps reel n'est requis pour un CRUD visible.

## Checks

- `make phpstan` si backend modifie
- `make lint && make build` si frontend modifie
- test manuel ou automatisable du flux si possible

## Documentation durable seulement si

Nouveau type de topic, changement d'autorisation Mercure, nouvelle strategie de reconnexion ou nouvelle convention repository SSE.
