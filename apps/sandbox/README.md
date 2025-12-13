# Sandbox (développement)

Cette app Angular sert à valider le template généré par `@obsidiane/meridiane`.

## Démarrage

Depuis la racine du repo :

```bash
npm install
npm run sandbox:dev
```

Ce que ça fait :
- régénère la lib `projects/bridge-sandbox` via le CLI local
- lance `ng serve sandbox`

## Build (CI / vérification)

```bash
npm run sandbox:build
```

Notes :
- `apps/sandbox/projects/bridge-sandbox` est un artefact généré (ignoré par git).

