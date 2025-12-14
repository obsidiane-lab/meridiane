# Sandbox (développement)

Cette app Angular sert à valider le template généré par `@obsidiane/meridiane`.

## Démarrage

Depuis la racine du repo :

```bash
npm install
npm run sandbox:dev
```

Ce que ça fait :
- build le package `@obsidiane/bridge-sandbox` via le CLI local (standalone)
- installe le package dans `apps/sandbox/node_modules`
- lance `ng serve sandbox`

Pré-requis :
- le backend doit exposer la spec OpenAPI sur `http://localhost:8000/api/docs.json` (valeurs par défaut de `meridiane dev` dans ce repo).

## Build (CI / vérification)

```bash
npm run sandbox:build
```

Notes :
- l’artefact build est dans `apps/sandbox/dist/bridge-sandbox` (et un `.tgz` via `npm pack`)
