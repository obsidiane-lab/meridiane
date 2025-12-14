# Utilisation

Référence CLI (options, presets, sorties). Pour le workflow end-to-end : `docs/creer-un-bridge.md`.

## Prérequis

- Node.js ≥ 18 + npm
- Spec OpenAPI : URL `http(s)://…` ou fichier JSON local

## TL;DR

```bash
# Dev (build + install local dans node_modules)
meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json --formats application/ld+json

# CI/CD (build + artefact npm publiable)
meridiane build @acme/backend-bridge --version 1.2.3 --spec ./openapi.json --formats application/ld+json
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
- `--formats <mimeTypes>` : formats (media types) à générer, basé sur les endpoints réels (`paths`) (répétable, support `,`).
  - ex: `--formats application/ld+json`
  - ex: `--formats application/ld+json,application/json`
- `--include <substr>` : ne garde que les schémas dont le nom contient `<substr>` (répétable, support `,`).
- `--exclude <substr>` : retire les schémas dont le nom contient `<substr>` (répétable, support `,`).
- `--no-models` : ne génère pas les models (et `--spec` devient inutile).
- `--debug` : logs détaillés.
- `--version <semver>` : (build uniquement) version du package généré.

## Formats (naming + runtime)

Meridiane génère les modèles selon les formats demandés (contract-driven depuis `paths`).

- Pour `application/ld+json` :
  - modèles `extends Item`
  - les champs Hydra `@id/@type/@context` ne sont pas dupliqués dans les modèles (déjà dans `Item`)
- Pour les autres formats (ex: `application/json`) :
  - pas d’`extends Item` imposé (le schéma fait foi)

Dans tous les cas :
- groups conservés (ex: `Account-user.read` ⇒ `AccountUserRead`)
- pas de modèles `*.jsonMergePatch` (PATCH = `Partial<...>`)
- noms normalisés (pas de suffixe `.jsonld`, ex: `Payment.jsonld` ⇒ `Payment`)

## Exemples `--formats`

```bash
# 1) JSON-LD uniquement (Hydra) — recommandé pour API Platform
meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json --formats application/ld+json

# 2) JSON “pur” uniquement
meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json --formats application/json

# 3) Multi-format (ordre = format primaire)
# Ici, ld+json est primaire : les collisions seront suffixées côté JSON (ex: *Json)
meridiane build @acme/backend-bridge --version 1.2.3 --spec ./openapi.json --formats application/ld+json,application/json

# Ici, json est primaire : les collisions seront suffixées côté ld+json (ex: *LdJson)
meridiane build @acme/backend-bridge --version 1.2.3 --spec ./openapi.json --formats application/json,application/ld+json

# 4) multipart/form-data (DTO d’upload), sans `extends Item`
meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json --formats multipart/form-data
```

## Nullable mode (all vs spec)

Le mode “nullable” est piloté par le paramètre interne `requiredMode` (valeurs : `all` ou `spec`) :

- `dev` : `all` → toutes les props sont optionnelles et `| null`.
- `build` : `spec` → respecte `required` et `nullable` du schéma.

Exemple (schéma : `required: ['id']`, `opt` nullable) :
- `spec` : `id: string`, `opt?: string | null`
- `all` : `id?: string | null`, `opt?: string | null`

## Workflow CI/CD (pipeline backend)

```bash
npx -y @obsidiane/meridiane@0.1.0 build "$BRIDGE_PACKAGE_NAME" \
  --version "$BRIDGE_VERSION" \
  --spec "$OPENAPI_SPEC" \
  --formats application/ld+json

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
