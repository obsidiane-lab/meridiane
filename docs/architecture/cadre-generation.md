# Cadre de génération (Engine + Targets)

Ce document formalise le **cadre de génération** de Meridiane afin de supporter plusieurs technologies (“targets”) tout en garantissant :
- une **lecture OpenAPI unique** (source de vérité) ;
- des **modèles identiques** (même sélection, même nommage, mêmes règles) quel que soit le target ;
- une **API runtime homogène** (mêmes intentions et mêmes noms : `BridgeFacade`, `ResourceRepository`, méthodes REST de base) ;
- une séparation nette entre :
  - le **moteur** (agnostique techno) ;
  - et les **targets** (implémentations techno, ex. Angular, Symfony/PHP).

L’objectif fonctionnel du bridge est de **faciliter la communication entre services** en encapsulant les conventions de transport : base URL, auth, cookies, headers, formats, comportements HTTP, etc.
Le bridge est le “client officiel” côté application consommatrice.

---

## Terminologie

- **Engine** : orchestration + parsing d’options + lecture OpenAPI + construction d’une représentation commune (IR) + délégation à un target.
- **Target** : implémentation d’une technologie (ex. `angular`, `symfony`). Un target sait générer des fichiers et, éventuellement, produire un artefact publiable (`build`) ou supporter une boucle de dev (`dev`).
- **IR (Intermediate Representation)** : représentation *neutre* de ce qui est généré (modèles + endpoints + métadonnées). Tous les targets reçoivent la **même IR**.
- **Runtime** : code “bridge” utilisé à l’exécution (HTTP, auth, helpers). Le runtime doit présenter les mêmes concepts d’un target à l’autre.

---

## Principes non négociables (règles)

### R1 — OpenAPI est parsé une seule fois
Le parsing OpenAPI, la sélection des schémas, la normalisation des noms et la construction des endpoints se font **dans l’engine**.
Un target **ne lit pas** la spec OpenAPI.

### R2 — Modèles identiques partout
Le **nammage actuel Angular** est la référence globale.
Les règles de sélection (formats, include/exclude, dépendances transitives, exclusion merge-patch, etc.) sont identiques pour tous les targets.

### R3 — Endpoints “flat”
L’IR des endpoints est **plate** : chaque entrée correspond à un couple `(path, method)` (et ses variantes : query, request body, response).
Le développeur consommera le runtime en fournissant l’endpoint qui l’intéresse (pas de “services par ressource” imposés par l’engine).

### R4 — API runtime homogène
Les concepts et noms restent :
- `BridgeFacade`
- `ResourceRepository`
- méthodes REST de base : `get`, `getCollection`, `post`, `put`, `patch`, `delete` (et un `request` bas niveau).

Chaque target implémente ces concepts dans son langage/écosystème, mais l’intention et l’ergonomie doivent rester alignées.

### R5 — CLI unique, options identiques
Le CLI accepte **les mêmes arguments** pour tous les targets.
Les options spécifiques à une techno peuvent exister, mais :
- elles sont parsées au même endroit ;
- et leur interprétation (support / rejet) est la responsabilité du target.

### R6 — Support des modes = responsabilité du target
Les modes (`generate`, `build`, `dev`) existent côté CLI de manière globale.
Si un target ne supporte pas un mode, il doit lever une exception “not supported” :
- c’est un choix **de l’implémentation target** ;
- l’engine n’implémente pas de logique spéciale pour “compenser”.

### R7 — Le bridge gère les conventions (auth/transport)
Le bridge encapsule le “comment communiquer” :
- cookies / credentials,
- headers par défaut,
- (éventuellement) stratégie d’auth,
- formats,
- comportements HTTP.

L’application consommatrice ne doit pas recopier ces règles : elle configure le bridge et l’utilise.

---

## Contrat CLI (global)

### Commandes
- `meridiane generate <packageName>`
- `meridiane build <packageName>`
- `meridiane dev [packageName]`

> Le sens exact de `packageName` dépend du target (ex. npm vs composer), mais l’argument est unique côté CLI. Toute validation fine est faite par le target.

### Options communes (tous targets)
- `--target <id>` : identifiant du target (ex. `angular`, `symfony`)
- `--spec <url|file>` : source OpenAPI (URL ou fichier JSON)
- `--formats <mimeTypes>` : média types (liste et ordre significatifs)
- `--include <substr>` / `--exclude <substr>` : filtres sur noms de schémas
- `--no-models` : skip modèles
- `--out <dir>` : répertoire de sortie (au moins pour `generate`)
- `--version <semver>` : version de l’artefact (`build` et/ou `generate`)
- `--debug`

### Exemples

Génération Angular (fichiers seulement) :

```bash
npx meridiane generate @acme/backend-bridge --target angular --spec ./openapi.json
```

Génération Symfony/PHP (bundle) :

```bash
npx meridiane generate acme/backend-bridge-php --target symfony --spec ./openapi.json
```

Build publiable (artefact target-specific) :

```bash
npx meridiane build acme/backend-bridge-php --target symfony --spec ./openapi.json --version 1.2.3
```

---

## Architecture : Engine + Targets

### Engine (responsabilités)
L’engine doit :
1. Parser les options CLI (communes).
2. Charger la spec OpenAPI (`--spec`) si nécessaire (sauf `--no-models`).
3. Construire l’IR commune :
   - `modelsIR`
   - `endpointsIR`
   - métadonnées (formats sélectionnés, mode required, etc.)
4. Résoudre un target via une factory/registry.
5. Déléguer au target le mode demandé (`generate|build|dev`).

L’engine ne doit pas :
- connaître npm/composer ;
- connaître Angular/Symfony ;
- “patcher” le comportement d’un target.

### Contrat Target (interface)
Chaque target doit implémenter une interface conceptuelle stable.

Pseudo (neutre) :

```ts
type Mode = "generate" | "build" | "dev";

type TargetCapabilities = {
  generate: true;
  build: boolean;
  dev: boolean;
};

type NotSupportedError = Error & { code: "NOT_SUPPORTED"; target: string; mode: Mode };
type UnsupportedOptionError = Error & { code: "UNSUPPORTED_OPTION"; target: string; option: string };

type CommonConfig = {
  target: string;
  packageName: string;
  specSource?: string;
  formats: string[];
  include: string[];
  exclude: string[];
  noModels: boolean;
  outDir?: string;
  version?: string;
  debug: boolean;
};

type EngineContext = {
  cwd: string;
  mode: Mode;
  config: CommonConfig;
  spec?: unknown; // OpenAPI document (déjà chargé)
  ir?: BridgeIR;  // déjà construit si noModels=false ou si endpoints/modeling requis
  log?: { step?: (msg: string) => void; info?: (msg: string) => void; success?: (msg: string) => void; debug?: (msg: string, data?: any) => void };
};

interface Target {
  id: string;
  capabilities: TargetCapabilities;
  normalize(config: CommonConfig): CommonConfig; // validation + enrichissement target-specific
  run(ctx: EngineContext): Promise<void>;        // route vers generate/build/dev (ou expose generate/build/dev)
}
```

Règles d’implémentation :
- `capabilities` est la source de vérité “déclarative” (utile pour help/erreurs) ;
- malgré `capabilities`, l’implémentation doit rester robuste : si `mode` n’est pas supporté, lever `NotSupportedError`.

### Targets (responsabilités)
Un target doit :
- valider/interpréter les inputs qui le concernent (ex. règles de nommage d’un package) ;
- générer les fichiers dans `--out` (mode `generate`) ;
- produire un artefact (mode `build`) si supporté ;
- supporter `dev` si pertinent.

Un target ne doit pas :
- parser OpenAPI ;
- réécrire les règles de sélection des modèles ;
- modifier l’IR (sauf via des mécanismes d’extension explicitement prévus et versionnés).

---

## IR commune (contrat du moteur)

L’IR est le point de stabilité majeur : chaque target se branche dessus.

### `BridgeIR` (conteneur)
L’IR doit être structurée comme un conteneur versionné :

```json
{
  "irVersion": 1,
  "formats": ["application/ld+json"],
  "models": [],
  "endpoints": []
}
```

Règles :
- `irVersion` est obligatoire et incrémenté en cas de breaking change ;
- un target peut refuser une `irVersion` inconnue (erreur explicite).

### `ModelsIR`
Représentation neutre d’un modèle.

Exemple (illustratif) :

```json
{
  "name": "Book",
  "extends": ["Item"],
  "props": [
    { "name": "@id", "type": "string", "nullable": false, "required": false, "jsonLd": true },
    { "name": "title", "type": "string", "nullable": true, "required": false },
    { "name": "author", "type": { "ref": "User" }, "nullable": true, "required": false }
  ]
}
```

Règles de production (résumé) :
- Nommage : **mêmes règles que le target Angular actuel**.
- Formats : la sélection est guidée par `--formats`, et l’ordre a un impact (format primaire).
- Filtres : `--include/--exclude` s’appliquent sur noms OpenAPI et noms canoniques.
- Dépendances : les dépendances transitives sont conservées pour éviter de casser la compilation/génération.
- Modèles merge-patch : exclus de la génération.

> Détails exacts : se référer à l’implémentation existante du pipeline Angular ; cette logique devient une brique “openapi/modeling” du moteur.

#### Système de types (neutre)
Pour éviter que chaque target “réinterprète” librement les types, l’IR doit fournir un système de types explicite.

Exemple de forme (illustrative) :

```json
{ "kind": "string" }
{ "kind": "number" }
{ "kind": "boolean" }
{ "kind": "null" }
{ "kind": "array", "items": { "kind": "ref", "name": "User" } }
{ "kind": "map", "values": { "kind": "string" } }
{ "kind": "union", "types": [{ "kind": "string" }, { "kind": "null" }] }
{ "kind": "ref", "name": "Book" }
```

Règles :
- le moteur “fige” la structure des types (pas un `string` TS, pas un `string` PHP) ;
- chaque target fait uniquement la traduction (emission) vers son langage.

### `EndpointsIR` (flat)
Chaque endpoint est identifié par `(method, path)` et décrit de façon neutre :

```json
{
  "method": "GET",
  "path": "/api/books",
  "operationId": "api_books_get_collection",
  "query": [
    { "name": "page", "type": "number", "required": false }
  ],
  "requestBody": null,
  "responses": [
    { "status": 200, "contentType": "application/ld+json", "type": { "ref": "BookCollection" } }
  ]
}
```

Le moteur doit produire un ensemble cohérent permettant au runtime :
- d’exécuter un appel HTTP (`request`) ;
- de proposer les méthodes REST convenience (`get`, `getCollection`, `post`, `put`, `patch`, `delete`).

> L’IR endpoints doit rester “flat”. Tout groupement (par ressource, par tag, etc.) est optionnel et peut être produit en *vue secondaire* mais ne doit pas être le cœur.

#### Exemple avec body (POST) et réponses multiples

```json
{
  "method": "POST",
  "path": "/api/books",
  "operationId": "api_books_post",
  "query": [],
  "requestBody": {
    "required": true,
    "content": [
      { "contentType": "application/ld+json", "type": { "kind": "ref", "name": "Book" } }
    ]
  },
  "responses": [
    { "status": 201, "contentType": "application/ld+json", "type": { "kind": "ref", "name": "Book" } },
    { "status": 400, "contentType": "application/problem+json", "type": { "kind": "ref", "name": "ConstraintViolationList" } }
  ]
}
```

---

## Runtime contract (Bridge)

Le runtime fourni par un target doit permettre :
- un usage “bas niveau” par endpoints (flat) ;
- sans obliger une architecture applicative spécifique ;
- en encapsulant les conventions de communication (cookies/auth/headers).

### `BridgeFacade`
Rôle : point d’entrée simplifié pour exécuter des appels, appliquer les defaults et offrir des helpers.

Contrat (pseudo-code, neutre) :

```ts
class BridgeFacade {
  // Base (flat)
  request<R>(req: HttpRequestConfig): R

  // REST convenience
  get<R>(url: string, opts?: HttpCallOptions): R
  getCollection<R>(url: string, query?: Query, opts?: HttpCallOptions): R
  post<R>(url: string, body: unknown, opts?: HttpCallOptions): R
  put<R>(url: string, body: unknown, opts?: HttpCallOptions): R
  patch<R>(url: string, body: unknown, opts?: HttpCallOptions): R
  delete(url: string, opts?: HttpCallOptions): void
}
```

### `ResourceRepository<T>`
Rôle : API typed orientée “resource” (optionnelle mais conservée pour cohérence et compat).
Le concept doit exister (même si l’implémentation diffère).

### Options et conventions (transport)
Le runtime doit offrir des primitives pour :
- définir la base URL ;
- définir des headers globaux et/ou par requête ;
- gérer cookies/credentials (ex. Angular : `withCredentials`).

> Les mécanismes exacts (interceptors, middleware, options HTTP client, etc.) sont target-specific. Le contrat impose l’intention, pas la stack.

### Conventions de génération (idempotence et sécurité)
Pour rendre le framework de génération fiable et “industrializable” :
- Les sorties sont **déterministes** : à inputs identiques (spec + options + templates), le résultat doit être identique.
- La génération est **idempotente** : relancer `generate` écrase/reconstruit dans le dossier de sortie, sans effets ailleurs.
- Le moteur/target ne modifie pas de fichiers hors `--out` (sauf explicitement documenté par le mode/target).
- Les templates doivent utiliser un mécanisme de placeholders stable (le choix technique est libre, mais le résultat doit rester déterministe).

---

## Packaging (mode `build`)

Le mode `build` produit un artefact publiable et/ou transportable.

Règles :
- Le moteur déclenche `target.build(...)`.
- Si le target ne supporte pas `build`, il lève `NotSupportedError("build")`.
- Le `--version` est fourni par le moteur au target. Le target l’applique à son metadata (ex. `package.json`, `composer.json`).

Ce que l’engine ne fait pas :
- lancer `npm pack` ;
- lancer une commande composer ;
- écrire un fichier de packaging target-specific.

---

## Targets prévus (phase 1)

### Target `angular`
But : bridge Angular (runtime + modèles TS) et packaging npm.
Le runtime comprend :
- `BridgeFacade`, `ResourceRepository`, helpers HTTP,
- et peut inclure des features supplémentaires (ex. SSE/Mercure) si le target le supporte.

### Target `symfony` (PHP)
But : génération d’un **Symfony Bundle** (runtime + DTO) et packaging composer.
Contrainte fonctionnelle : **pas de SSE** dans ce target.
Le bundle doit exposer le runtime (services) et les DTO.

> La structure exacte du bundle (namespace, nom du bundle, wiring DI) dépend d’options target-specific et doit être documentée dans le doc du target.

---

## Gestion des features (ex. SSE)

Une feature (comme SSE) ne doit pas contaminer le contrat commun si elle n’est pas universelle.
Approche :
- le runtime commun couvre l’essentiel (REST + config transport + hooks auth) ;
- le target Angular peut ajouter SSE sous une API optionnelle ;
- le target Symfony ne l’implémente pas.

---

## Erreurs et support

### Erreur “mode non supporté”
Si un target ne supporte pas un mode :
- lever une erreur explicite et stable (ex. `NotSupportedError`),
- inclure : targetId, mode, raison, suggestion (ex. “utilisez generate”).

### Erreur “option non supportée”
Si une option est fournie mais non supportée par un target :
- lever une erreur explicite “UnsupportedOptionError(optionName)”.

---

## Ajouter un target (procédure)

Créer un target doit rester un travail localisé (pas de modifications “transverses” complexes).

Étapes :
1. Créer un dossier `tools/targets/<id>/` (ou équivalent).
2. Implémenter l’interface Target (`id`, `capabilities`, `normalize`, `run`).
3. Ajouter le target au registry/factory (`targets/registry`).
4. Ajouter templates + émetteurs nécessaires.
5. Documenter : options supportées, modes supportés, structure des outputs.

Règle : un nouveau target ne doit pas requérir de changer l’IR (sauf nouveau besoin général, versionné via `irVersion`).

## Exemples d’usage (côté application)

### Usage flat (objectif principal)
Le développeur choisit son endpoint et appelle une méthode REST.

Pseudo :

```ts
const api = new BridgeFacade(/* config transport */);
const book = await api.get("/api/books/123");
const page1 = await api.getCollection("/api/books", { page: 1 });
```

### Convention auth/cookies (rôle du bridge)
Le bridge doit permettre une config “les requêtes partent avec cookies” (cas Angular actuel).
La forme exacte dépend du target, mais la responsabilité est toujours la même :
- centraliser et appliquer le comportement par défaut,
- permettre de surcharger au cas par cas.

---

## À compléter / décisions explicitement requises

Ce document fixe le cadre commun. Les points suivants doivent être définis (sans quoi l’implémentation ne peut pas être “strictement” finalisée) :

1. **Packaging Symfony/PHP (build)** : quel est l’artefact attendu (dossier prêt, archive, autre) ?
2. **Nommage bundle/namespace** : comment dériver (ou imposer) le namespace et le nom du bundle à partir de `<packageName>` ?
3. **Contrat précis `HttpCallOptions`** : quelles options sont “universelles” (headers, credentials, timeout, retries) et lesquelles restent target-specific ?
4. **Stratégie auth** : quels mécanismes doivent être couverts officiellement (cookie, bearer, custom headers) et comment les exposer (hook, strategy, config) sans lier à une stack ?
