# Foundation - instructions durables

## Communication

- Repondre en francais.
- Etre direct, factuel et pragmatique.
- Signaler hypotheses, risques concrets et limites.
- Resumer les changements, les checks executes et la documentation durable si concernee.

## Regle de charge cognitive

Codex doit lire le minimum de contexte necessaire pour produire un diff correct.
Pour une tache standard, lire seulement :

1. `AGENTS.md` ;
2. le skill principal dans `.agents/skills/` ;
3. la recette correspondante dans `.codex/recipes/` ;
4. le `AGENTS.md` du scope touche si necessaire (`core/AGENTS.md` ou `webfront/AGENTS.md`) ;
5. les cartes de patterns et references utiles ;
6. l'exemple de code le plus proche ;
7. les fichiers reellement modifies.

Ne pas scanner toute la documentation par reflexe. Ne pas creer de documentation durable par defaut. Ne pas ecrire d'architecture decision record pour une micro-decision.

## Skills repo

Les skills `obsidiane-*` sont des competences de livraison, pas des technologies. Les details techniques vivent dans les recipes, pattern cards, `core/docs/`, `webfront/docs/` ou references chargees a la demande. Un skill technique externe peut completer ce socle lorsqu'il est explicitement integre au template.

Utiliser un seul skill principal `obsidiane-*` de `.agents/skills/` quand la tache correspond clairement a son `description`. Un skill technique complementaire est charge uniquement quand la technologie concernee est reellement touchee. Garder le budget de contexte : preferer un skill principal, une recette et les references necessaires plutot que charger plusieurs skills par reflexe.

`.codex/` et `.agents/` forment le socle agentique fige du template. Les stabiliser ici, puis ne plus les modifier dans les projets derives sauf evolution explicite du template agentique. Ne pas ajouter d'outillage de maintenance specifique pour ces dossiers par defaut.

Skills principaux :

- `obsidiane-project-bootstrap` : derivation initiale du template.
- `obsidiane-feature-delivery` : cadrage et livraison d'une feature metier transverse.
- `obsidiane-webapp-feature` : parcours Angular, page, CRUD, listing, formulaire ou action visible.
- `obsidiane-api-backend` : API Platform, ressource, endpoint, Doctrine, migration ou service backend.
- `obsidiane-frontend-ux` : UI Angular, AppTable, formulaire, route, i18n, service/store/repository.
- `obsidiane-api-contract` : contrat OpenAPI, bridge Meridiane et typing genere.
- `obsidiane-realtime-sync` : Mercure, SSE, topics, watch$, watchCollection$ et store live.
- `obsidiane-async-workflow` : Messenger, Scheduler, queue, worker, batch ou effet differe.
- `obsidiane-security` : auth, ownership, roles, tenant, XSRF, OIDC, donnees sensibles.
- `obsidiane-intervention-debug` : bug, regression, diagnostic runtime ou refactor local.
- `obsidiane-review` : review de diff ou PR.
- `obsidiane-upgrade-source-validation` : upgrade, versions, sources officielles et contradictions.
- `obsidiane-durable-documentation` : documentation projet durable quand elle est explicitement necessaire.

Skills techniques complementaires :

- `spartan` : skill technique obligatoire pour toute interface Angular visible. Il couvre la decouverte des composants, leur generation par CLI, leur composition et leur verification selon les conventions Foundation.

## Workflow par defaut

1. Reformuler mentalement l'objectif, les contraintes et le `done when`.
2. Choisir un seul skill principal dans `.agents/skills/`.
3. Lire une recipe principale dans `.codex/recipes/`.
4. Lire le `AGENTS.md` du scope touche : `core/AGENTS.md` ou `webfront/AGENTS.md`.
5. Pour toute UI Angular, charger le skill `spartan` et appliquer `webfront/AGENTS.md`.
6. Lire seulement les references et pattern cards utiles.
7. Inspecter un exemple ou un code existant equivalent.
8. Si une odeur d'architecture existe, lire `.codex/patterns/architecture/pattern-choice.md`, choisir le pattern Foundation le plus simple et le justifier en une phrase.
9. Lancer le generateur natif pertinent quand il existe et peut tourner : `php bin/console make:*`, `php bin/console d:m:diff`, `ng generate`, `npm run ng -- generate @spartan-ng/cli:ui`, `make bridge`.
10. Implementer un diff coherent et borne.
11. Lancer le plus petit check suffisant.
12. En sortie, indiquer les checks executes et si une documentation durable etait necessaire.

Lire plus que ce budget seulement si la tache est transverse, securite, contrat public, source externe, contradiction documentaire ou code existant non conforme.

## Documentation durable

Par defaut : aucune documentation durable.

Mettre a jour `docs/project/` uniquement si la modification change une convention, une architecture, un contrat public, une regle de securite ou une connaissance metier reutilisable dans plusieurs projets.

Mettre a jour `docs/project/architecture-decisions.md` seulement pour une decision structurante, transverse, couteuse a inverser ou controversee.

Pour une feature standard, une correction de bug, un champ, une page ou un CRUD couvert par les recettes : ne pas creer de fiche feature ni de decision log. En sortie, ecrire simplement : `Documentation durable : non necessaire`.

## Invariants non negociables

- Ecrire en francais dans les messages et la documentation projet.
- Les tests unitaires Angular et Symfony sont interdits : ne pas en creer, en ajouter ni en regenerer. Valider les changements avec lint, build, PHPStan et des verifications manuelles ciblees selon le besoin.
- Ne jamais modifier `webfront/bridge/` a la main ; corriger le contrat backend puis lancer `make bridge`.
- Spartan UI est l'unique kit UI du webfront. Toute interface visible applique `webfront/AGENTS.md`, le skill `spartan` et la convention durable `webfront/docs/ui/spartan.md`.
- `webfront/src/app/shared/ui/` est une sortie du CLI Spartan : aucune edition manuelle ni aucun composant applicatif dans ce dossier.
- Backend : contrat API d'abord ; Entity Doctrine `ApiResource` pour CRUD interne/backoffice simple ; DTO `ApiResource` si contrat public, stable, sensible ou divergent ; relations exposees par IRI par defaut ; provider/processor/Voter seulement s'ils apportent une vraie valeur.
- Frontend : respecter `store -> repository -> service -> composant`.
- CRUD visible : strategie SSE/Mercure explicite, y compris `non necessaire` avec justification.
- Securite et ownership : le backend decide ; le frontend n'est jamais la seule barriere.
- Preferer les mecanismes natifs Symfony, API Platform et Angular.
- Generation de code : utiliser d'abord les generateurs natifs quand ils couvrent le besoin (`ng generate` cote Angular, `php bin/console make:*` cote Symfony), puis adapter au pattern Foundation.
- Migrations Doctrine : ne pas les ecrire a la main pour un changement de schema simple ; generer avec `php bin/console d:m:diff`, relire, puis adapter seulement si necessaire.
- Corriger une contradiction documentaire au lieu de la contourner.

## Recettes et workflows

Recettes principales :

- Bootstrap projet : `.codex/recipes/project-bootstrap.md`
- Feature metier transverse : `.codex/recipes/feature-delivery.md`
- CRUD fullstack : `.codex/recipes/crud-fullstack.md`
- Backend API Platform : `.codex/recipes/backend-api-resource.md`
- Page frontend : `.codex/recipes/frontend-page.md`
- Bridge / contrat : `.codex/recipes/bridge-contract.md`
- SSE / Mercure : `.codex/recipes/sse-mercure.md`
- Async / Messenger / Scheduler : `.codex/recipes/async-worker.md`
- Auth / securite : `.codex/recipes/auth-security.md`
- Bugfix / refactor : `.codex/recipes/bugfix-existing-code.md`
- Upgrade / sources officielles : `.codex/recipes/upgrade-source-validation.md`
- Documentation durable explicite : `.codex/recipes/durable-documentation.md`

Workflows utiles : bootstrap, feature delivery, CRUD, endpoint API Platform, page Angular, bridge, SSE, async, bugfix, validation par sources officielles et verification des checks.

## Checks de reference

- Backend : `make phpstan`
- Frontend : `make lint && make build` ; ajouter le healthcheck Spartan pour une generation ou un upgrade Spartan.
- Bridge : `make bridge`
