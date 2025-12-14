# Utilisation (Meridiane)

Référence CLI (options, presets, sorties). Pour le workflow end-to-end : `docs/creer-un-bridge.md`.

## Prérequis

- Node.js ≥ 18 + npm
- Spec OpenAPI : URL `http(s)://…` ou fichier JSON local

## TL;DR

```bash
# Dev (build + install local dans node_modules)
meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json --preset=native

# CI/CD (build + artefact npm publiable)
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

- `--spec <url|file>` : source OpenAPI (URL ou JSON local). Requis sauf `--no-models`.
- `--preset [native|all]` : sélection des schémas.
  - absent ⇒ `all`
  - `--preset` seul ⇒ `native`
- `--include <substr>` : ne garde que les schémas dont le nom contient `<substr>` (répétable, support `,`).
- `--exclude <substr>` : retire les schémas dont le nom contient `<substr>` (répétable, support `,`).
- `--no-models` : ne génère pas les models (et `--spec` devient inutile).
- `--debug` : logs détaillés.
- `--version <semver>` : (build uniquement) version du package généré.

## Presets (naming)

Meridiane génère toujours des interfaces TypeScript qui **étendent `Item`**.

- `--preset=all` : conserve toutes les variantes présentes dans la spec.
  - ex: `ConstraintViolation.jsonld` ⇒ `ConstraintViolationJsonld`
- `--preset=native` : vise des types “entity-like”.
  - ex: `ConstraintViolation.jsonld` / `ConstraintViolation` ⇒ `ConstraintViolation`

## Workflow CI/CD (pipeline backend)

```bash
npx -y @obsidiane/meridiane@0.1.0 build "$BRIDGE_PACKAGE_NAME" \
  --version "$BRIDGE_VERSION" \
  --spec "$OPENAPI_SPEC" \
  --preset=native

npm publish dist/<libName>
```

Notes :
- `npx -y …` fonctionne aussi depuis un dossier “vide” : Meridiane crée `dist/` dans le répertoire courant.
- `npm publish` est volontairement hors de Meridiane (le pipeline reste responsable).

## Développement Meridiane (ce repo)

- `npm run sandbox:bridge` : build + install bridge (models)
- `npm run sandbox:dev` : sync + `ng serve`
- `npm run sandbox:build` : sync bridge + build app

Note : par défaut, `meridiane dev` (dans ce repo) lit la spec sur `http://localhost:8000/api/docs.json`.
