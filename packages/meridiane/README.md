# @obsidiane/meridiane

CLI pour générer une librairie Angular “bridge” (Symfony / API Platform / Mercure) et générer des modèles TypeScript depuis une spec OpenAPI.

Documentation détaillée (repo) : `docs/index.md`.

## Installation

```bash
npm i -D @obsidiane/meridiane
```

Ou en global :

```bash
npm i -g @obsidiane/meridiane
```

## Usage

```bash
# Dev: génère le bridge (+ models par défaut)
# (build standalone + install local dans node_modules)
npx meridiane dev <packageName> --spec <url|file> [--formats <mimeTypes>]... [--include <substr>]... [--exclude <substr>]... [--no-models] [--debug]

# CI/CD: génère + build Angular + npm pack (artefact prêt à publier)
npx meridiane build <packageName> --version <semver> --spec <url|file> [--formats <mimeTypes>]... [--include <substr>]... [--exclude <substr>]... [--no-models] [--debug]
```

Options :
- `--debug` : active des logs supplémentaires (CLI).
- `--formats` : peut être répété ou fourni en liste séparée par virgules :
  - `--formats application/ld+json`
  - `--formats application/ld+json,application/json`

Bonnes pratiques :
- utiliser `--formats application/ld+json` (ou plusieurs formats) pour un mode “contract-driven” :
  - modèles générés uniquement s’ils sont utilisés par les endpoints (pour ces formats)
  - groups conservés
  - pas de modèles `*.jsonMergePatch` (PATCH = `Partial<...>`)
  - noms normalisés (pas de suffixe `.jsonld`)
- utiliser `--no-models` si vous voulez uniquement le runtime (pas besoin de `--spec`)
- laisser le registry à la CI (`.npmrc`, variables d’environnement, `npm publish --registry …`)

Note (repo Meridiane) :
- dans le repo Meridiane, `meridiane dev` peut être exécutée sans `packageName` et se préconfigure pour `apps/sandbox` (`@obsidiane/bridge-sandbox`).

## Exemple CI (générer + build + publish)

```bash
npx -y @obsidiane/meridiane@0.1.0 build @acme/backend-bridge --version 0.1.0 --spec https://staging.example/api/docs.json --formats application/ld+json
npm publish dist/backend-bridge
```

Note : Meridiane installe le toolchain (`ng-packagr`, `@angular/*`, …) dans `dist/.meridiane-workspace` si nécessaire.
