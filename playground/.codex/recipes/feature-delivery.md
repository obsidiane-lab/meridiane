# Feature delivery

## Quand utiliser

Feature metier decrite en termes produit, surtout si elle touche plusieurs
surfaces : ressource API, persistance, parcours Angular, formulaire, securite,
temps reel, async, integration externe ou documentation potentielle.

## Ne pas utiliser quand

La demande est une page, un CRUD, un endpoint, un bug, une review ou une tache
technique simple couverte par une recipe specialisee.

## Lire d'abord

- `AGENTS.md`
- skill `obsidiane-feature-delivery`
- `core/AGENTS.md` si `core/` est touche
- `webfront/AGENTS.md` si `webfront/` est touche

## Workflow

1. Reformuler mentalement le `done when` en resultat verifiable.
2. Identifier acteurs, donnees, operations, ecrans, permissions, contrat API et
   effets de bord.
3. Demander une clarification seulement si le modele metier, la securite ou une
   action destructive est ambigu.
4. Router vers la recipe specialisee si la feature est finalement simple.
5. Detecter une odeur de conception concrete : contrat public divergent,
   workflow d'etat, integration externe, pipeline, action differee, creation
   complexe, duplication durable ou service trop gros.
6. Si une odeur existe, lire `.codex/patterns/architecture/pattern-choice.md` et
   choisir le pattern Foundation le plus simple. Sinon, ne pas ajouter de
   pattern generique.
7. Pour une feature transverse, ordonner le diff :
   `modele -> migration -> securite backend -> contrat API -> bridge -> store/repository/service -> UI Angular -> realtime/async -> docs si necessaire`.
8. Utiliser les generateurs natifs quand ils couvrent le besoin :
   `php bin/console make:*`, `php bin/console d:m:diff`, `ng generate` et
   `make bridge`.
9. Relire le code genere et adapter aux patterns Foundation.
10. Ne pas ajouter endpoint public, auth, worker, realtime ou documentation
    durable sans besoin explicite ou consequence directe de la feature.

## Recipes specialisees

- `.codex/recipes/crud-fullstack.md`
- `.codex/recipes/backend-api-resource.md`
- `.codex/recipes/frontend-page.md`
- `.codex/recipes/bridge-contract.md`
- `.codex/recipes/sse-mercure.md`
- `.codex/recipes/async-worker.md`
- `.codex/recipes/auth-security.md`
- `.codex/recipes/durable-documentation.md`

## Checks

- `make phpstan` si backend, Doctrine, securite ou contrat API touche.
- `make bridge` si le contrat API visible change.
- `make lint && make build` si frontend touche.
- Checks Docker/Symfony cibles si runtime, worker, Mercure ou Compose change.

## Documentation durable

Par defaut : `Documentation durable : non necessaire`.

Mettre a jour `docs/project/` seulement si la feature introduit une convention,
une architecture, un contrat public, une regle de securite ou une connaissance
metier reutilisable.
