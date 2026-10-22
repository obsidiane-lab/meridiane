# Meridiane

CLI pour générer un bridge Angular depuis une spec OpenAPI (API Platform + Mercure), avec un backend Symfony et une sandbox Angular pour valider le runtime.

Meridiane 3.0 prend en charge Mercure 1.0. Le bridge fournit les types du contrat API,
les appels HTTP et les abonnements temps réel. Dans l'application consommatrice,
les repositories alimentent des stores à signaux avec les ressources reçues ; les services
portent les agrégations et la logique métier, et les composants affichent les signaux.
Les relations restent des IRI lorsque le backend les expose ainsi : leur chargement à la
demande et la cohérence entre ressources appartiennent à l'application.

Les abonnements `watch$()` transmettent directement les ressources JSON reçues.
Les suppressions conservent le payload `{"@id": ...}` ; le helper
`isResourceDeletion()` permet au repository de les appliquer au store.

![CI](https://github.com/obsidiane-lab/meridiane/actions/workflows/ci.yml/badge.svg)

## Organisation du monorepo

- `packages/meridiane` : le produit publié, package npm `@obsidiane/meridiane` et CLI de génération
- `playground` : l'environnement interne utilisé pour développer et valider le générateur
  - `playground/core` : API Symfony/API Platform + Mercure 1.0
  - `playground/webfront` : application Angular Foundation qui consomme le bridge local généré
- `docs` : documentation produit (CLI, guide d'intégration, HTTP, SSE, API publique)

Le package publié ne dépend pas du playground. Le playground fournit uniquement un contrat OpenAPI et des scénarios réels pour développer le générateur.

## Pré-requis

- Node.js `>=24.15`
- npm `>=11`
- Docker + Docker Compose v2

## Démarrage local rapide

1. Installer les dépendances du workspace :

```bash
npm ci
```

2. Démarrer et initialiser le playground Foundation :

```bash
cd playground
make init
```

URLs locales :
- backend : `http://localhost:8000`
- docs API : `http://localhost:8000/api/docs`
- sandbox Angular : `http://localhost:4200`

Le playground est anonyme et fournit une conversation avec deux messages. Son
[README](playground/README.md) décrit les scénarios et la génération du bridge local.

## Utiliser le CLI Meridiane

```bash
# Génération dans le workspace courant (sources locales)
npx meridiane generate @acme/backend-bridge --spec ./openapi.json

# Boucle de dev (build + installation locale dans node_modules)
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json

# Build publiable (dist + npm pack)
npx meridiane build @acme/backend-bridge --version 1.2.3 --spec https://staging.example/api/docs.json
```

## Scripts utiles (racine)

- `npm run playground:bridge` : régénère le bridge depuis l'export OpenAPI local (`make bridge` réexporte aussi le contrat)
- `npm run playground:dev` : lance `ng serve` sur le port 4200, en remplacement du conteneur webfront
- `npm run playground:build` : compile le frontend avec son bridge généré

Les commandes historiques `npm run sandbox:bridge`, `npm run sandbox:dev` et `npm run sandbox:build` restent disponibles avec le même comportement.

Le projet n'utilise aucun test unitaire ; ne pas en ajouter. La validation repose sur
la compilation, les contrôles de package npm, le lint, PHPStan et des vérifications
ciblées dans le navigateur selon le périmètre. Le workflow est décrit dans
[l'architecture du dépôt](docs/contributing/architecture.md#validation).

## Documentation

- Guide bridge : `docs/guide-bridge.md`
- CLI : `docs/cli.md`
- API publique : `docs/fonctionnalites/api.md`
- HTTP / Hydra : `docs/fonctionnalites/http.md`
- Mercure / SSE : `docs/fonctionnalites/mercure-sse.md`
- FAQ : `docs/fonctionnalites/questions-frequentes.md`
- Package npm : `packages/meridiane/README.md`
- Environnement de développement : `playground/README.md`
- Application Angular : `playground/webfront/README.md`
- API Symfony : `playground/core/README.md`
- Architecture interne : `docs/contributing/architecture.md`
