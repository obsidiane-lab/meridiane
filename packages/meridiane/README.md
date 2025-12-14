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
# Générer des fichiers d'init (config + snippets)
npx meridiane init

# Générer une librairie Angular (dans projects/<lib-name>)
npx meridiane lib <lib-name> <npm-package-name> [version] [url-registry]

# Générer des modèles depuis OpenAPI
npx meridiane models <SPEC_OPENAPI_URL_OU_FICHIER_JSON> [--out=<dir>] [--item-import=../lib/ports/resource-repository.port] [--required-mode=all-optional|spec] [--no-index]

# Dev: regen lib + models depuis un backend (localhost par défaut)
npx meridiane dev-bridge <lib-name> <npm-package-name> [version]

# Dev (repo meridiane): met à jour le bridge du sandbox
npx meridiane sandbox-bridge
```

Options :
- `--debug` : active des logs supplémentaires (CLI).

`url-registry` est optionnel. Recommandé : gérer le registry via `.npmrc` / variables CI plutôt que de le passer au générateur.

Bonnes pratiques :
- exécuter `meridiane init` une fois au début du repo du bridge (pour `models.config.js`, `.env.example`, snippets Angular)
- committer `models.config.js` et `.env.example`, ne pas committer `.env`
- générer les modèles dans `projects/<lib-name>/src/models` pour publier les types avec le package

## Exemple CI (générer + build + publish)

```bash
npm ci
npx -y @obsidiane/meridiane@0.1.0 lib backend-bridge @acme/backend-bridge 0.1.0
npx -y @obsidiane/meridiane@0.1.0 models http://localhost:8000/api/docs.json --out=projects/backend-bridge/src/models
npx ng build backend-bridge
cd dist/backend-bridge
npm publish
```

Si votre workspace ne contient pas `ng-packagr` (souvent le cas dans une app Angular “pure”), installez-le :

```bash
npm i -D ng-packagr
```

## Configuration (models.config.js)

Le générateur de modèles charge automatiquement un fichier `models.config.js` s’il existe dans le répertoire courant (CWD) ou dans un dossier parent.

Copie rapide (après installation) :

```bash
cp node_modules/@obsidiane/meridiane/models.config.example.js ./models.config.js
```

Exécuter `meridiane init` est généralement plus simple (ça pose aussi `.env.example` et un snippet Angular).

## Configuration via `.env`

Le CLI charge automatiquement un fichier `.env` (CWD ou dossier parent) avant d’exécuter `lib/models`.

Variables utiles :
- `MERIDIANE_DEBUG=1`
- `MERIDIANE_LIB_VERSION=0.1.0`
- `MERIDIANE_NPM_REGISTRY_URL=https://…`
- `MERIDIANE_MODELS_OUT=projects/<lib>/src/models`
- `MERIDIANE_MODELS_REQUIRED_MODE=spec`
- `MERIDIANE_MODELS_ITEM_IMPORT=../lib/ports/resource-repository.port`
- `MERIDIANE_MODELS_NO_INDEX=1`

Ordre de priorité :
1) flags CLI
2) `models.config.js`
3) `.env`
4) valeurs par défaut

Sans installation préalable :

```bash
npx -y @obsidiane/meridiane lib <lib-name> <npm-package-name> [version] [url-registry]
```
