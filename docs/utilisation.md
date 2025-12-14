# Utilisation (CLI)

Cette page documente le CLI Meridiane : commandes, options et artefacts.

Pour un guide “end-to-end” (CI → publish → consommation) : `docs/creer-un-bridge.md`.  
Pour l’usage côté app Angular : `docs/consommer-un-bridge.md`.

## Prérequis

- Node.js ≥ 18 (20+ recommandé)
- npm
- Une spec OpenAPI (URL `http(s)://…` ou fichier JSON local), sauf si vous utilisez `--no-models`

## Installer le CLI

Dans un projet :

```bash
npm i -D @obsidiane/meridiane
```

Puis :

```bash
npx meridiane --help
```

## Commandes

### `meridiane dev [packageName]`

Génère et build le bridge dans `dist/`, puis l’installe localement dans `node_modules` (copie offline depuis `dist/`).

Ce mode est pratique pour développer une app Angular contre un backend en cours.

Sorties :
- `dist/<libName>/` + `dist/<libName>/*.tgz`
- `node_modules/<packageName>/` (package copié tel quel depuis `dist/<libName>`)

Dans ce repo, `meridiane dev` sans `packageName` cible l’app sandbox (`apps/sandbox`) et `@obsidiane/bridge-sandbox`.

### `meridiane build <packageName> --version <semver>`

Génère et build le bridge, puis produit un `.tgz` (via `npm pack`) prêt à être publié.

Sorties :
- `dist/<libName>/` (package npm publiable)
- `dist/<libName>/*.tgz` (artefact packé)

## Options

### `--spec <url|file>`

Source OpenAPI :
- URL (ex: `https://staging.example/api/docs.json`)
- ou fichier JSON local (ex: `./openapi.json`)

Requis sauf `--no-models`.

### `--formats <mimeTypes>`

Liste des media types à générer. Option répétable et compatible avec une liste `,`.

Exemples :

```bash
--formats application/ld+json
--formats application/ld+json,application/json
```

Important : `--formats` active un mode “contract-driven” : Meridiane traverse les endpoints (`paths`) et ne génère que les modèles réellement utilisés par ces formats.

### `--include <substr>` / `--exclude <substr>`

Filtres sur les noms de schémas OpenAPI (répétables, supports `,`).

### `--no-models`

Génère uniquement le runtime (pas de models). Dans ce cas, `--spec` n’est pas nécessaire.

### `--version <semver>`

Uniquement pour `build`. Cette valeur est écrite dans le `package.json` du bridge.

### `--debug`

Active des logs détaillés côté CLI.

## Détails de génération des models

### JSON-LD (`application/ld+json`)

- Les models générés `extends Item`.
- Les champs Hydra `@id/@type/@context` ne sont pas dupliqués (ils sont déjà dans `Item`).

### Autres formats (ex: `application/json`)

- Pas d’`extends Item` imposé : le schéma OpenAPI fait foi.

### Règles communes

- Les schemas “merge-patch” ne génèrent pas de modèle : `PATCH` est typé en `Partial<T>`.
- Les noms sont normalisés (ex: `Payment.jsonld` ⇒ `Payment`).

## Exemple CI/CD (backend)

```bash
npx -y @obsidiane/meridiane@latest build "$BRIDGE_PACKAGE_NAME" \
  --version "$BRIDGE_VERSION" \
  --spec "$OPENAPI_SPEC" \
  --formats application/ld+json

npm publish dist/<libName>
```

Notes :
- `dist/` est créé dans le répertoire courant (aucun workspace Angular requis).
- `npm publish` reste volontairement hors de Meridiane.
