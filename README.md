# Meridiane

Meridiane génère, depuis le contrat OpenAPI d'API Platform, une librairie Angular qui
fournit les modèles TypeScript, le client HTTP et le temps réel Mercure 1.0 de votre API.
Le bridge gère la connexion ; la gestion des données reste dans votre application.

```ts
provideBridge({baseUrl: '/', mercure: {hubUrl: '/.well-known/mercure', authorize: '/api/mercure/authorization'}});

const projects = inject(FacadeFactory).create<Project>({url: '/api/projects'});
projects.getCollection$({page: 1});   // HTTP
projects.watch$();                    // créations, modifications et suppressions en direct
```

**[Lire la documentation →](docs/README.md)**

![CI](https://github.com/obsidiane-lab/meridiane/actions/workflows/ci.yml/badge.svg)

## Organisation du monorepo

- `packages/meridiane` : le produit publié, package npm `@obsidiane/meridiane` et CLI de génération
- `playground` : l'environnement interne utilisé pour développer et valider le générateur
  - `playground/core` : API Symfony/API Platform + Mercure 1.0
  - `playground/webfront` : application Angular Foundation qui consomme le bridge local généré
- `docs` : documentation pour les développeurs qui utilisent le bridge

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

Le playground n'a pas de compte utilisateur ; l'abonnement Mercure passe par le cookie
posé par `/api/mercure/authorization`. Il fournit une conversation avec deux messages. Son
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

- [Documentation du bridge](docs/README.md) : démarrage, fonctionnement, configuration, HTTP, temps réel, backend, recettes, référence, CLI, dépannage, migration.
- Environnement de développement : [playground/README.md](playground/README.md).
- Architecture interne du générateur : [docs/contributing/architecture.md](docs/contributing/architecture.md).
