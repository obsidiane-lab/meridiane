# Utilisation (Meridiane)

Meridiane génère un **package npm bridge Angular** à partir d’une spec **OpenAPI (API Platform)**.
Il est **standalone** : pas de config persistante, pas de patch de workspace, build via `dist/.meridiane-workspace`.

## Prérequis

- Node.js ≥ 18 + npm
- Spec OpenAPI : URL `http(s)://…` ou fichier JSON local

## TL;DR

```bash
# Dev (build + install local dans node_modules)
meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json --preset=native

# CI/CD (build + artefact npm)
meridiane build @acme/backend-bridge --version 1.2.3 --spec ./openapi.json --preset=native
```

## Commandes

### `meridiane dev [packageName]`

Build le bridge et l’installe localement dans `node_modules` (copie offline depuis `dist/`).

- sorties : `dist/<libName>`, `dist/<libName>/*.tgz`, `node_modules/<packageName>`
- dans ce repo : `meridiane dev` sans `packageName` cible `apps/sandbox` et `@obsidiane/bridge-sandbox`

### `meridiane build <packageName> --version <semver>`

Build le bridge et produit un `.tgz` prêt à publier.

- sorties : `dist/<libName>`, `dist/<libName>/*.tgz`

## Options

- `--spec <url|file>` : requis sauf `--no-models`
- `--preset [native|all]` : absent ⇒ `all` ; `--preset` seul ⇒ `native`
- `--include <substr>` / `--exclude <substr>` : filtres (répétables, support `,`)
- `--no-models` : runtime uniquement
- `--debug` : logs détaillés
- `--version <semver>` : (build uniquement) version du package généré

## Workflow CI/CD (pipeline backend)

```bash
npx -y @obsidiane/meridiane@0.1.0 build "$BRIDGE_PACKAGE_NAME" \
  --version "$BRIDGE_VERSION" \
  --spec "$OPENAPI_SPEC" \
  --preset=native

npm publish dist/<libName>
```

## Développement Meridiane (ce repo)

- `npm run sandbox:bridge` : build + install bridge (models)
- `npm run sandbox:dev` : sync + `ng serve`
- `npm run sandbox:build` : sync bridge + build app

Note : par défaut, `meridiane dev` (dans ce repo) lit la spec sur `http://localhost:8000/api/docs.json`.
