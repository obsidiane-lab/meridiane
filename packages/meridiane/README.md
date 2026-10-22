# @obsidiane/meridiane

CLI pour générer un bridge Angular (runtime + models TypeScript) depuis une spec OpenAPI (API Platform + Mercure).

Meridiane 3.0 cible Mercure 1.0. Le bridge conserve les ressources JSON reçues et leurs
relations par IRI. Les stores à signaux, repositories et services métier restent dans
l'application consommatrice ; Meridiane fournit les types, HTTP et les abonnements temps réel.

`watch$(iri?)` retourne un `Observable<T | ResourceDeletion>` : la ressource JSON
reçue pour une création ou modification, ou `{"@id": ...}` pour une suppression,
avec ses éventuels `@type` et `@context`. Le helper exporté
`isResourceDeletion()` permet au repository de retirer la ressource du store par
son `@id`.

Documentation complète du repo : `docs/guide-bridge.md`.

Le bridge généré déclare Angular 20, 21 et 22 comme peer dependencies. Il est compilé
en Partial-Ivy pour être consommé par une application de version Angular égale ou
supérieure à celle du compilateur de la bibliothèque.

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
- mode contract-driven : uniquement les schémas atteignables via `paths` et `webhooks` pour les formats sélectionnés
- modèles `*jsonMergePatch*` non générés (`PATCH` typé `Partial<T>`)
- `generate`, `dev` et `build` produisent les mêmes modèles pour une même spec et les mêmes options ; les propriétés requises et la nullabilité suivent le contrat OpenAPI
- Meridiane ne publie pas : publication via `npm publish` côté CI

## Couverture des schémas

Le compilateur suit les types d’[OpenAPI 3.0](https://spec.openapis.org/oas/v3.0.4.html) et le dialecte
[JSON Schema 2020-12 d’OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0.html#schema-object) :

- primitives, unions de `type`, objets, propriétés requises, dictionnaires et schémas booléens ;
- tableaux homogènes, tuples `prefixItems`, tuples historiques et bornes de longueur des tuples ;
- `enum` et `const`, y compris les valeurs JSON structurées ;
- `allOf`, `oneOf`, `anyOf`, `nullable` et références locales vers `components.schemas` ou `$defs` ;
- schémas racine objets sous forme d’interfaces et autres schémas sous forme d’aliases TypeScript ;
- contrats atteignables depuis les bodies, paramètres, en-têtes, callbacks et webhooks.

Les règles de validation sans équivalent structurel TypeScript (`pattern`, bornes numériques,
`uniqueItems`, `contains`, `not`, conditions, fermeture exacte des propriétés, etc.) restent à la
charge de la validation runtime. Les références externes doivent être préalablement regroupées dans
le document OpenAPI fourni à Meridiane.

## Spécifique à ce repo

Dans ce monorepo, `meridiane dev` peut être exécuté sans `packageName` et cible alors `@obsidiane/bridge-sandbox` (app `playground/angular-app`).
