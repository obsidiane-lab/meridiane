# Sandbox Angular

Application Angular de démonstration pour valider le bridge généré par `@obsidiane/meridiane`.

## Objectif

La sandbox vérifie en conditions réelles :
- appels HTTP (Hydra + endpoints custom)
- auth JWT
- upload multipart
- realtime Mercure (`watch$`, `watchSubResource$`, `watchTypes$`)
- stratégies SSE (`connectionMode`, `newConnection`, diagnostics)

## Pré-requis

- backend disponible sur `http://localhost:8000`
- endpoints docs OpenAPI accessibles (`/api/docs.json`)

Démarrage backend (depuis la racine du repo) :

```bash
cd apps/backend
docker compose up -d --build
docker compose exec php php bin/console app:dev:reset --no-interaction
cd ../..
```

## Démarrage sandbox

Depuis la racine :

```bash
npm install
npm run sandbox:dev
```

Ce que fait `sandbox:dev` :
- lance `bridge:sync` (`node ../../packages/meridiane/cli.js dev`)
- génère/build le package `@obsidiane/bridge-sandbox`
- l'installe dans `apps/sandbox/node_modules`
- lance `ng serve sandbox`

URL : `http://localhost:4200`

## Auth de dev

Comptes fixtures :
- `dev@meridiane.local` / `dev`
- `admin@meridiane.local` / `admin`

## Scripts utiles

Dans `apps/sandbox` :

- `npm run bridge:sync` : regénérer le bridge sandbox
- `npm run dev` : bridge sync + `ng serve sandbox`
- `npm run build` : bridge sync + build Angular
- `npm run test` : tests Angular
- `npm run lint` : lint

## Forcer une spec locale

```bash
npm -w apps/sandbox run bridge:sync -- --spec ./openapi.json
```

## Pages principales

- `/login` : login JWT
- `/conversations` : CRUD + watch conversation/messages
- `/conversations/:id/messages` : vue dédiée messages
- `/http` : lab HTTP (echo, delay, flaky, upload)
- `/watch-types` : lab `watchTypes$` + diagnostics realtime
