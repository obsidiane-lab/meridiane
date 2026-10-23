# Contrat de verification

## Regle

Prouver le changement avec le plus petit check suffisant. Ne pas remplacer les checks par une documentation supplementaire. Les tests unitaires Angular et Symfony sont interdits.

## Relecture

- Verifier que le diff respecte la recette et les patterns lus.
- Backend : contrat API, securite, schema, bridge et ownership evalues si touches.
- Frontend : `store -> repository -> service -> composant`, signal d'entite, strategie de formulaire unique et logique `forms/*.form.ts` appliques quand le cas les demande.
- UI frontend : conformité aux invariants de `webfront/AGENTS.md` et au skill `spartan`.
- Bridge : aucune modification manuelle de `webfront/bridge/`.
- SSE : strategie explicite pour CRUD visible.
- Pas de provider/processor pass-through, Voter vide ou abstraction speculative.

## Matrice

- Backend PHP/API : `make phpstan` ; migration via `php bin/console d:m:diff` si schema ; verification manuelle ciblee si logique.
- Frontend Angular : `make lint`, `make build` ; `make lint` porte les garde-fous d'architecture UI simples.
- Spartan : `npm run ng -- generate @spartan-ng/cli:healthcheck --auto-fix --dry-run --interactive=false` si une dependance, une primitive ou une API Spartan change.
- Bridge/contrat : `make bridge` puis `make build`.
- SSE/Mercure : checks backend/frontend + verification du cycle abonnement si possible.
- Securite/auth : checks scope + review humaine recommandee si donnees sensibles ou autorisation change.

## Sortie

Dire quels checks ont ete executes. Si un check pertinent n'a pas ete execute, donner la raison concrete. Indiquer aussi si une documentation durable etait necessaire selon `AGENTS.md`.
