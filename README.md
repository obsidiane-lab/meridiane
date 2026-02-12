# Meridiane

CLI pour générer un bridge Angular depuis une spec OpenAPI (API Platform + Mercure), avec un backend Symfony et une sandbox Angular pour valider le runtime.

![CI](https://github.com/obsidiane-lab/meridiane/actions/workflows/ci.yml/badge.svg)

## Monorepo

- `packages/meridiane` : package npm `@obsidiane/meridiane` (CLI de génération)
- `apps/backend` : backend Symfony/API Platform + Mercure utilisé pour le développement
- `apps/sandbox` : application Angular de démonstration qui consomme un bridge généré
- `docs` : documentation produit (CLI, guide d'intégration, HTTP, SSE, API publique)

## Pré-requis

- Node.js `>=20.19`
- npm
- Docker + Docker Compose v2 (pour le backend)

## Démarrage local rapide

1. Installer les dépendances du workspace :

```bash
npm install
```

2. Démarrer le backend :

```bash
cd apps/backend
docker compose up -d --build
# optionnel mais recommandé au premier démarrage :
docker compose exec php php bin/console app:dev:reset --no-interaction
```

3. Lancer la sandbox Angular depuis la racine du repo :

```bash
cd ../..
npm run sandbox:dev
```

URLs locales :
- backend : `http://localhost:8000`
- docs API : `http://localhost:8000/api/docs`
- sandbox Angular : `http://localhost:4200`

Comptes de dev (fixtures) :
- `dev@meridiane.local` / `dev`
- `admin@meridiane.local` / `admin`

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

- `npm run sandbox:bridge` : regénère le bridge sandbox
- `npm run sandbox:dev` : bridge sandbox + `ng serve`
- `npm run sandbox:build` : bridge sandbox + build Angular

## Documentation

- Guide bridge : `docs/guide-bridge.md`
- CLI : `docs/cli.md`
- API publique : `docs/fonctionnalites/api.md`
- HTTP / Hydra : `docs/fonctionnalites/http.md`
- Mercure / SSE : `docs/fonctionnalites/mercure-sse.md`
- FAQ : `docs/fonctionnalites/questions-frequentes.md`
- Package npm : `packages/meridiane/README.md`
- Sandbox Angular : `apps/sandbox/README.md`
- Backend Symfony : `apps/backend/README.md`
