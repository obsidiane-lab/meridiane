# @obsidiane/meridiane

CLI pour générer une librairie Angular “bridge” (Symfony / API Platform / Mercure) et générer des modèles TypeScript depuis une spec OpenAPI.

Documentation détaillée (repo) : `docs/index.md` et `docs/utilisation.md`.

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
npx meridiane dev <packageName> --spec <url|file> [--preset[=native|all]] [--include <substr>]... [--exclude <substr>]... [--no-models] [--debug]

# CI/CD: génère + build Angular + npm pack (artefact prêt à publier)
npx meridiane build <packageName> --version <semver> --spec <url|file> [--preset[=native|all]] [--include <substr>]... [--exclude <substr>]... [--no-models] [--debug]
```

Options :
- `--debug` : active des logs supplémentaires (CLI).

Bonnes pratiques :
- utiliser `--preset=native` si vous voulez des modèles “entity-like” (sans variantes `.jsonld/.jsonMergePatch`)
- utiliser `--no-models` si vous voulez uniquement le runtime (pas besoin de `--spec`)
- laisser le registry à la CI (`.npmrc`, variables d’environnement, `npm publish --registry …`)

Note (repo Meridiane) :
- dans le repo Meridiane, `meridiane dev` peut être exécutée sans `packageName` et se préconfigure pour `apps/sandbox` (`@obsidiane/bridge-sandbox`).

## Exemple CI (générer + build + publish)

```bash
npm ci
npx -y @obsidiane/meridiane@0.1.0 build @acme/backend-bridge --version 0.1.0 --spec https://staging.example/api/docs.json --preset=native
npm publish dist/backend-bridge
```

Si votre workspace ne contient pas `ng-packagr` (souvent le cas dans une app Angular “pure”), installez-le :

```bash
npm i -D ng-packagr
```
