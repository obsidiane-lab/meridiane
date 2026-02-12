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

### `meridiane dev [packageName]`

Workflow dev complet :

1. génère le bridge dans un workspace standalone sous `dist/.meridiane-workspace`
2. build la lib (`ng-packagr`)
3. exécute `npm pack` dans `dist/<libName>/`
4. installe localement le package dans `node_modules/<packageName>` (copie offline)

```bash
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json
```

Particularité de ce repo :
- `packageName` est optionnel et vaut alors `@obsidiane/bridge-sandbox`
- Meridiane applique les defaults sandbox (`apps/sandbox`)

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

### `--formats <mimeTypes>`

Option répétable ou liste séparée par `,`.

Exemples :

```bash
--formats application/ld+json
--formats application/ld+json,application/json
```

Comportement :
- active le mode contract-driven
- seuls les schémas réellement atteignables depuis `paths` pour les formats demandés sont générés
- valeur par défaut si absent : `application/ld+json`

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

## Résolution de la spec en mode `dev` (sandbox)

Quand vous lancez `meridiane dev` sans `packageName` dans ce repo, la spec est résolue dans cet ordre :

1. valeur explicite `--spec`
2. `apps/backend/var/openapi.json` si le fichier existe
3. `http://localhost:8000/api/docs.json`

Si la spec par défaut est indisponible et que `--spec` n'a pas été fourni, Meridiane bascule en `--no-models` (warning non bloquant).

## Chargement d'URL OpenAPI

Pour une URL finissant par `/api/docs.json`, Meridiane tente automatiquement un fallback vers `/api/docs.jsonopenapi` si le premier endpoint échoue.

## Notes utiles

- `PATCH` sur schémas merge-patch : pas de modèle dédié, typage en `Partial<T>`.
- Les noms de modèles sont normalisés et désambiguïsés selon le format si nécessaire.
- `meridiane generate` ne modifie pas `angular.json`.
