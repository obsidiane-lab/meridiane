# CLI

Référence des commandes Meridiane, options et sorties.

## Getting Started

1. Installer le CLI : `npm i -D @obsidiane/meridiane`
2. Vérifier l’installation : `npx meridiane --help`

## Commandes

### `meridiane generate <packageName>`

Génère uniquement les fichiers du bridge dans le workspace courant (pas de build, pas de `npm pack`).

```bash
npx meridiane generate @acme/backend-bridge --spec ./openapi.json
```

Sorties :
- `projects/<libName>/` (par défaut)
- ou le chemin fourni via `--out <dir>`

Note : Meridiane ne modifie pas `angular.json` ni votre outil de build. L’intégration dans le workspace reste à votre charge.

### `meridiane dev [packageName]`

Build standalone + installation locale dans `node_modules` (copie offline depuis `dist/`).
À lancer **depuis le répertoire de votre app Angular**.

```bash
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json
```

Sorties :
- `dist/<libName>/` + `dist/<libName>/*.tgz`
- `node_modules/<packageName>/`

### `meridiane build <packageName>`

Build standalone + `npm pack` (artefact publiable).
Ce mode peut être exécuté depuis **n’importe quel répertoire**.

```bash
npx meridiane build @acme/backend-bridge --version 1.2.3 --spec https://staging.example/api/docs.json
```

Sorties :
- `dist/<libName>/` (package prêt à publier)
- `dist/<libName>/*.tgz`

## Options

### `--spec <url|file>`

Source OpenAPI :
- URL (ex: `https://staging.example/api/docs.json`)
- ou fichier JSON local (ex: `./openapi.json`)

Requis sauf `--no-models`.

### `--formats <mimeTypes>`

Liste des media types à générer. Option répétable ou liste `,`.
L’ordre est significatif (format primaire en premier).

Exemples :

```bash
--formats application/ld+json
--formats application/ld+json,application/json
```

Active un mode “contract-driven” : Meridiane traverse les endpoints (`paths`) et ne génère que les modèles réellement utilisés par ces formats.

### `--include <substr>` / `--exclude <substr>`

Filtres sur les noms de schémas OpenAPI (répétables, supportent `,`).

### `--no-models`

Génère uniquement le runtime (pas de models). Dans ce cas, `--spec` n’est pas nécessaire.

### `--version <semver>`

Pour `build` et `generate`. Cette valeur est écrite dans le `package.json` du bridge.
Si omise, Meridiane utilise `0.0.0` par défaut (pratique en local, déconseillé pour publier).

### `--out <dir>`

Uniquement pour `generate`. Répertoire de sortie du bridge (défaut `projects/<libName>`).

### `--debug`

Active des logs détaillés côté CLI.

## Notes

- Les schemas “merge-patch” ne génèrent pas de modèle : `PATCH` est typé en `Partial<T>`.
- Les noms sont normalisés (ex: `Payment.jsonld` ⇒ `Payment`).
