# Recipes Foundation

Les recipes sont des procedures projet courtes. Un skill principal choisit une
recipe principale, puis lit seulement les pattern cards, references et exemples
utiles.

## Routage

| Besoin | Recipe |
| --- | --- |
| Bootstrap template | `project-bootstrap.md` |
| Feature metier transverse | `feature-delivery.md` |
| CRUD fullstack | `crud-fullstack.md` |
| Backend API Platform | `backend-api-resource.md` |
| Page ou composant Angular | `frontend-page.md` |
| Bridge / contrat / typing | `bridge-contract.md` |
| SSE / Mercure / temps reel | `sse-mercure.md` |
| Async / Messenger / Scheduler | `async-worker.md` |
| Auth / securite / ownership | `auth-security.md` |
| Bugfix ou refactor local | `bugfix-existing-code.md` |
| Upgrade / source validation | `upgrade-source-validation.md` |
| Documentation durable explicite | `durable-documentation.md` |

## Regle

Lire une seule recipe principale par defaut. Lire une deuxieme recipe seulement
si la tache touche reellement deux axes, par exemple feature webapp + securite.

Avant code : 1 recipe, 1 a 3 pattern cards, 1 exemple, les fichiers modifies.
Les recipes et pattern cards sont la source operatoire.

Utiliser les generateurs natifs quand ils couvrent le besoin et peuvent tourner :
`php bin/console make:*`, `php bin/console d:m:diff`, `ng generate`,
`npm run ng -- generate @spartan-ng/cli:ui --name=<component>` pour une primitive Spartan absente,
`make bridge`.

## Documentation

Toutes les recettes appliquent la meme regle : pas de documentation durable sauf declencheur explicite. Voir `docs/project/durable-memory-policy.md`.
