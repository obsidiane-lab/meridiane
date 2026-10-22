# CLI

Référence des commandes Meridiane, options et comportements effectifs.

## Installation

```bash
npm i -D @obsidiane/meridiane
npx meridiane --help
```

## Commandes

### `meridiane generate <packageName>`

Génère les sources du bridge dans le workspace courant.

- pas de build `ng-packagr`
- pas de `npm pack`
- sortie par défaut : `projects/<libName>/`
- sortie custom : `--out <dir>`

```bash
npx meridiane generate @acme/backend-bridge --spec ./openapi.json
```

### `meridiane dev <packageName>`

Workflow dev complet :

1. génère le bridge dans un répertoire de build isolé sous `dist/.meridiane-workspace`
2. build la lib (`ng-packagr`)
3. exécute `npm pack` dans `dist/<libName>/`
4. installe localement le package dans `node_modules/<packageName>` (copie offline)

```bash
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json
```

La commande se lance depuis la racine de l'application Angular (dossier contenant `package.json`).

### `meridiane build <packageName>`

Workflow CI/CD : génération + build standalone + `npm pack`.

```bash
npx meridiane build @acme/backend-bridge --version 1.2.3 --spec https://staging.example/api/docs.json
```

Sorties :
- `dist/<libName>/`
- `dist/<libName>/*.tgz`

## Options

### `--spec <url|file>`

Source OpenAPI : URL HTTP(S) ou fichier JSON local.

Règle :
- requis sauf `--no-models`

### `--include <substr>` / `--exclude <substr>`

Filtres sur les noms de schémas OpenAPI.

- répétables
- support `,`
- appliqués avant expansion des dépendances transitives

### `--no-models`

Désactive complètement la génération des modèles TypeScript.

### `--version <semver>`

Disponible sur `build` et `generate`.

- écrit la version dans le `package.json` généré
- défaut : `0.0.0`

Note : en `dev`, la version est fixée à `0.0.0-dev`.

### `--out <dir>`

Disponible uniquement sur `generate`.

### `--debug`

Active les logs détaillés du CLI.

## Modèles générés

Meridiane lit le contrat tel quel : tous les schémas de `components.schemas` sont générés, sans sélection de format. Les formats exposés se configurent côté API Platform (`api_platform.formats`) ; le runtime du bridge parle JSON-LD.

- API Platform décrit une ressource plusieurs fois (`Book.jsonld`, `Book`, `Book.multipart`). Les représentations de même forme TypeScript donnent **un seul** modèle `Book`, construit depuis la représentation JSON-LD, qui étend `Item` (`@id`, `@type`, `@context`).
- Une représentation de forme différente garde un modèle distinct, suffixé par sa variante : `Json` pour le schéma sans suffixe, `Multipart` pour `.multipart` (ex. `Error` en JSON-LD et `ErrorJson` en `application/problem+json`).
- Les schémas `Hydra*` sont couverts par les types du runtime (`Item`, `Collection<T>`) et ne sont pas générés.
- Les schémas merge-patch (`PATCH`) n'ont pas de modèle dédié : typage en `Partial<T>`.

## Chargement d'URL OpenAPI

Pour une URL finissant par `/api/docs.json`, Meridiane tente automatiquement un fallback vers `/api/docs.jsonopenapi` si le premier endpoint échoue.

## Notes utiles

- `generate`, `dev` et `build` produisent les mêmes types pour une même spec et les mêmes options. Les propriétés requises et la nullabilité suivent OpenAPI, y compris en développement.
- Les noms de modèles sont normalisés (PascalCase, mots réservés évités).
- `meridiane generate` ne modifie pas `angular.json`.
- Migration depuis 2.x : `--formats` est supprimé (configurer les formats dans API Platform) et `dev` exige un `packageName`.
