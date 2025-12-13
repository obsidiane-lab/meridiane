# @obsidiane/meridiane

CLI pour générer une librairie Angular “bridge” (Symfony / API Platform / Mercure) et générer des modèles TypeScript depuis une spec OpenAPI.

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
# Générer une librairie Angular (dans projects/<lib-name>)
npx meridiane lib <lib-name> <npm-package-name> [version] [url-registry]

# Générer des modèles depuis OpenAPI
npx meridiane models <SPEC_OPENAPI_URL_OU_FICHIER_JSON> [--out=<dir>] [--item-import=../lib/ports/resource-repository.port] [--required-mode=all-optional|spec] [--no-index]
```

`url-registry` est optionnel. Recommandé : gérer le registry via `.npmrc` / variables CI plutôt que de le passer au générateur.

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

Le générateur de modèles charge automatiquement un fichier `models.config.js` s’il existe dans le répertoire courant (CWD).

Copie rapide (après installation) :

```bash
cp node_modules/@obsidiane/meridiane/models.config.example.js ./models.config.js
```

Sans installation préalable :

```bash
npx -y @obsidiane/meridiane lib <lib-name> <npm-package-name> [version] [url-registry]
```
