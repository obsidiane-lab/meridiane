# @obsidiane/meridiane

CLI pour générer un bridge Angular (runtime + models TypeScript) depuis une spec OpenAPI (API Platform + Mercure).

Documentation complète du repo : `docs/guide-bridge.md`.

## Installation

```bash
npm i -D @obsidiane/meridiane
```

## Commandes

### `meridiane generate <packageName>`

Génère uniquement les sources du bridge dans le workspace courant.

```bash
npx meridiane generate @acme/backend-bridge --spec ./openapi.json
```

Sortie par défaut : `projects/<libName>/` (modifiable via `--out`).

### `meridiane dev [packageName]`

Génération + build standalone + `npm pack` + installation locale dans `node_modules`.

```bash
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json
```

Sorties :
- `dist/<libName>/` + `dist/<libName>/*.tgz`
- `node_modules/<packageName>/`

### `meridiane build <packageName>`

Génération + build standalone + `npm pack` (artefact publiable).

```bash
npx meridiane build @acme/backend-bridge --version 1.2.3 --spec https://staging.example/api/docs.json
```

Sorties :
- `dist/<libName>/`
- `dist/<libName>/*.tgz`

## Options

- `--spec <url|file>` : URL OpenAPI ou fichier JSON local (requis sauf `--no-models`)
- `--formats <mimeTypes>` : répétable ou liste `,` ; défaut `application/ld+json`
- `--include <substr>` / `--exclude <substr>` : filtres de noms de schémas (répétables, support `,`)
- `--no-models` : runtime only
- `--version <semver>` : `build` et `generate` (défaut `0.0.0`)
- `--out <dir>` : uniquement `generate`
- `--debug` : logs détaillés

## Notes importantes

- fallback automatique `.../api/docs.json` -> `.../api/docs.jsonopenapi` si nécessaire
- mode contract-driven : uniquement les schémas atteignables via `paths` pour les formats sélectionnés
- modèles `*jsonMergePatch*` non générés (`PATCH` typé `Partial<T>`)
- Meridiane ne publie pas : publication via `npm publish` côté CI

## Spécifique à ce repo

Dans ce monorepo, `meridiane dev` peut être exécuté sans `packageName` et cible alors `@obsidiane/bridge-sandbox` (app `apps/sandbox`).
