# @obsidiane/meridiane

CLI pour générer un bridge Angular (API Platform + Mercure) depuis une spec OpenAPI.

Documentation complète (repo) : `docs/guide-bridge.md`.

## Installation

```bash
npm i -D @obsidiane/meridiane
```

Ou en global :

```bash
npm i -g @obsidiane/meridiane
```

## Commandes

### `meridiane generate <packageName>`

Génère uniquement les fichiers du bridge dans le workspace courant (pas de build, pas de `npm pack`).

```bash
npx meridiane generate @acme/backend-bridge --spec ./openapi.json
```

Sortie par défaut : `projects/<libName>/` (modifiable via `--out`).

### `meridiane dev [packageName]`

Build standalone + installation locale dans `node_modules`.

```bash
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json
```

Sorties :
- `dist/<libName>/` + `dist/<libName>/*.tgz`
- `node_modules/<packageName>/`

### `meridiane build <packageName>`

Build standalone + `npm pack` (artefact publiable).

```bash
npx meridiane build @acme/backend-bridge --version 0.1.0 --spec https://staging.example/api/docs.json
```

Sorties :
- `dist/<libName>/`
- `dist/<libName>/*.tgz`

## Options

- `--spec <url|file>` : source OpenAPI (URL ou fichier JSON local) ; requis sauf `--no-models`.
- `--formats <mimeTypes>` : répétable ou liste `,` (ordre significatif). Active le mode contract-driven.
- `--include/--exclude <substr>` : filtrer des noms de schémas OpenAPI.
- `--no-models` : ne génère que le runtime (pas de models).
- `--version <semver>` : version écrite dans le `package.json` (`build` + `generate`).
- `--out <dir>` : répertoire de sortie pour `generate` (défaut `projects/<libName>`).
- `--debug` : logs détaillés.

## Notes importantes

- `--formats` active un mode contract-driven : seuls les schemas réellement utilisés par les endpoints/paths sont générés.
- Les modèles `*.jsonMergePatch` ne sont jamais générés (`PATCH` est typé en `Partial<T>`).
- Meridiane **ne publie pas** : utilisez `npm publish` côté CI.

## Note (repo Meridiane)

Dans ce repo, `meridiane dev` peut être exécutée sans `packageName` et cible l’app sandbox (`apps/sandbox`).
