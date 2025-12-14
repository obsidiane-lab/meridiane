# Roadmap — Meridiane vNext (CLI simplifié)

Objectif : transformer Meridiane en un package npm “outil” qui ne propose plus que **2 commandes** (`dev` et `build`), sans fichier de config (`meridiane.config.*`), sans `.env`, et sans anciennes commandes (même en interne).

---

## 0) Contrat CLI (figé)

### Dérivation `libName` (règle unique)

À partir de `<packageName>` :
- si `<packageName>` est scoped (`@scope/mon-bridge`) ⇒ `libName = mon-bridge`
- sinon (`mon-bridge`) ⇒ `libName = mon-bridge`
- normalisation Angular : minuscule + remplace tout caractère hors `[a-z0-9-]` par `-` + trim des `-` multiples

Conséquences :
- le code est généré dans `projects/<libName>`
- le build Angular sort dans `dist/<libName>`
- `angular.json` contient `projects.<libName>`

### Paramètres communs (référence)

- (pas de flag) Workspace Angular = **répertoire courant (CWD)**, et il doit contenir `angular.json`
  - si `angular.json` est absent : la commande échoue avec un message clair indiquant de lancer Meridiane depuis la racine du workspace Angular
- `--debug` : logs verbeux

### Génération des models (contrat + flags conservés)

Objectif : garder uniquement les contrôles utiles pour ton usage (bridges Angular/API Platform) et supprimer le reste.

Décisions (figées) :
- `modelsDir` : toujours `projects/<libName>/src/models` (non configurable)
- `index.ts` : toujours généré (non configurable)
- Tous les models générés **étendent `Item`** (même les modèles “techniques”) :
  - `Item` est défini dans le runtime du bridge : `projects/<libName>/src/lib/ports/resource-repository.port.ts`
  - les models l’importent de façon native (import stable, non configurable)
- `requiredMode` :
  - `meridiane dev` : `all-optional`
  - `meridiane build` : `spec`
- `--spec <url|file>` : source de la spec OpenAPI (requis sauf `--no-models`)
  - si `http(s)://…` ⇒ télécharge l’URL
  - sinon ⇒ traite comme un chemin de fichier et lit le JSON local
  - fallback automatique (URL uniquement) : si l’URL finit par `/api/docs.json` et échoue ⇒ retry `/api/docs.jsonopenapi`
- `--preset [native|all]` : stratégie de sélection des schémas
  - si `--preset` est **absent** ⇒ comportement `all`
  - si `--preset` est présent sans valeur (ex: `--preset`) ⇒ comportement `native`
  - si `--preset=native` ⇒ comportement `native`
  - si `--preset=all` ⇒ comportement `all`
  - `native` = filtre les schémas “techniques” (Hydra*, jsonMergePatch, variantes `.jsonld/.jsonapi`)
  - `all` = garde tout (aucune notion de “flavor”)
- `--include <substr>` : ne garde que les schémas dont le nom contient `<substr>` (répétable et supporte valeurs séparées par virgule)
- `--exclude <substr>` : retire les schémas dont le nom contient `<substr>` (répétable et supporte valeurs séparées par virgule)
- `--no-models` : ne génère pas les models (dans ce mode, `--spec` n’est pas requis et `--preset/--include/--exclude` sont ignorés)

Note (important) :
- En `--preset=all`, la spec peut contenir des variantes `Foo`, `Foo.jsonld`, `Foo.jsonapi`, `Foo.jsonMergePatch`, etc.
  Meridiane doit donc garantir des **noms TypeScript non ambigus et stables** (pas de suffixes numériques “au hasard”).
  Voir la section “1.2.5 Naming stable en preset=all”.
- En `--preset=native`, la sortie attendue est “entity-like” :
  - ex: `ConstraintViolation`, `Conversation`, `User` (sans suffixes `Jsonld/JsonMergePatch`).
  - Les variantes `.jsonld/.jsonapi` et `*.jsonMergePatch` sont filtrées.

### Commande 1 — `meridiane dev`

But : pour les développeurs, lire la doc OpenAPI du backend et régénérer **bridge + models** dans un workspace Angular.

Usage :
```bash
meridiane dev <packageName> [--spec <url|file>] [--preset[=native|all]] [--include <substr>]... [--exclude <substr>]... [--no-models] [--debug]
```

Paramètres :
- `<packageName>` : nom npm du bridge (ex: `@acme/backend-bridge`), sert aussi à dériver `libName`
- `--spec <url|file>` : requis, sauf si `--no-models`
- `--debug` : optionnel

Comportement (fixe) :
- si models activés : la spec est résolue via `--spec` (URL ou fichier JSON local)
- régénère `projects/<libName>` depuis le template embarqué
- si models activés : régénère les models dans `projects/<libName>/src/models` (chemin non configurable)
- version injectée dans `projects/<libName>/package.json` : `0.0.0-dev`
- ne build pas, ne pack pas, ne publish pas

### Commande 2 — `meridiane build`

But : pour CI/CD, générer **bridge + models** puis produire un artefact npm publiable (sans publier).

Usage :
```bash
meridiane build <packageName> --version <semver> [--spec <url|file>] [--preset[=native|all]] [--include <substr>]... [--exclude <substr>]... [--no-models] [--debug]
```

Paramètres :
- `<packageName>` : idem `dev`
- `--version <semver>` : obligatoire, injectée dans le `package.json` de la lib générée
- `--spec <url|file>` : requis, sauf si `--no-models`
- `--debug` : optionnel

Comportement (fixe) :
- si models activés : la spec est résolue via `--spec` (URL ou fichier JSON local)
- régénère `projects/<libName>` (+ si models activés : `projects/<libName>/src/models`)
- build Angular de la lib : `ng build <libName>` (dans le CWD)
- pack npm : `npm pack` (dans `dist/<libName>`)
- ne fait jamais `npm publish` (le pipeline reste responsable)

---

## 1) Rework du code (tâches à entreprendre)

### 1.1 Implémenter `meridiane dev` et `meridiane build`

- [x] Ajouter les nouvelles commandes dans `packages/meridiane/cli.js` :
  - `dev` → exécute un nouveau tool `tools/dev.js`
  - `build` → exécute un nouveau tool `tools/build.js`
- [x] Implémenter :
  - parsing `packageName` → `libName`
  - validation des paramètres obligatoires (`--spec`, `--version` pour `build`) + validation workspace via présence de `angular.json` dans le CWD
  - parsing et validation des flags “models” conservés :
    - `--no-models` (si présent, `--spec` n’est pas requis)
    - `--preset[=native|all]` (présent ⇒ `native` par défaut ; absent ⇒ `all`)
    - `--include` / `--exclude` (répétables + support virgule)
  - résolution de `--spec` (URL vs fichier) + fallback `/api/docs.jsonopenapi` (URL uniquement), uniquement si models activés
  - application des règles de génération natives (dossier models, index.ts, requiredMode selon commande)
  - injection version :
    - `dev` : `0.0.0-dev`
    - `build` : valeur de `--version`

### 1.1.1 Parser CLI (DX) : supporter `--flag=value` ET `--flag value`

Contexte : le parser actuel (`tools/utils/cli-args.js`) ne supporte que `--name=value` pour les arguments.

Décisions (figées) :
- Meridiane supporte les 2 syntaxes :
  - `--spec=https://…` et `--spec https://…`
  - `--include=Foo` et `--include Foo` (idem pour `--exclude`)
  - `--preset=native` et `--preset native` (et `--preset` seul ⇒ `native`)

Travail à faire :
- [x] Remplacer le parser actuel par un parseur minimal qui gère :
  - flags booléens (`--no-models`, `--debug`, `--preset` sans valeur)
  - args avec `=` et args “séparés”
  - répétition des flags (ex: `--include A --include B`)

Critères d’acceptation :
- tous les exemples de la doc fonctionnent avec et sans `=`

### 1.1.2 Utiliser `commander` pour le CLI (DX + help)

Contexte : le repo utilise désormais `commander` pour simplifier le parsing et générer une aide cohérente.

Décisions (figées) :
- `packages/meridiane/cli.js` est implémenté via `commander` :
  - sous-commandes : `dev`, `build`
  - options répétables : `--include`, `--exclude`
  - option “présente sans valeur” : `--preset` ⇒ `native`
  - `--help` auto (et `-h` si désiré)
- Suppression de `packages/meridiane/tools/utils/cli-args.js` (plus utilisé).

Travail à faire :
- [x] Refactor `packages/meridiane/cli.js` pour définir la CLI avec `commander`.
- [x] S’assurer que la sémantique spéciale de `--preset` est respectée :
  - absent ⇒ `all`
  - présent sans valeur ⇒ `native`
  - présent avec valeur ⇒ `native|all`
- [x] Conserver une sortie d’erreur claire si arguments invalides.

Critères d’acceptation :
- `meridiane --help` est lisible et ne documente que `dev` et `build`
- `--include/--exclude` sont bien répétables

Critères d’acceptation :
- `node packages/meridiane/cli.js dev …` et `… build …` fonctionnent sans `.env` ni config externe
- les codes de sortie sont non-zéro en cas d’erreur (paramètres, fetch spec, génération, build)

### 1.2 Simplifier et centraliser la génération “bridge + models”

- [x] Créer une fonction utilitaire unique (ex: `tools/core/generate.js`) qui orchestre :
  1) génération lib (copie template + placeholders + patch `angular.json` + patch `projects/<libName>/package.json`)
  2) génération models (depuis la spec téléchargée)
- [x] Faire en sorte que `dev` et `build` appellent la même orchestration, avec uniquement un “profil” (dev/build) qui change `requiredMode`.

Critères d’acceptation :
- un seul chemin de code pour générer (évite divergence dev/build)

### 1.2.1 Rendre `modelsDir` et `itemImport` “natifs” (suppression des flags)

Objectif : supprimer toute possibilité de “placement arbitraire” des models et la dépendance à un import configurable, pour réduire la complexité et fiabiliser les bridges générés.

Décisions (figées) :
- Dossier des models : toujours `projects/<libName>/src/models`
- `Item` : est importé nativement depuis le runtime du bridge (import stable, non configurable) :
  - `projects/<libName>/src/lib/ports/resource-repository.port.ts`

Travail à faire :
- [x] Fixer le dossier de sortie des models : `projects/<libName>/src/models`
- [x] Modifier le template des models pour :
  - importer `Item` depuis `../lib/ports/resource-repository.port` (stable)
- [x] Adapter le générateur models pour :
  - supprimer totalement `itemImportPath` de l’API interne et des templates handlebars
- [x] Mettre à jour la surface runtime du bridge si nécessaire (si aujourd’hui `Item` vit ailleurs)

Critères d’acceptation :
- aucune option CLI ne permet de changer le dossier des models
- aucune option CLI ne contrôle un import de base type `Item`
- les models générés compilent avec la lib générée sans configuration additionnelle

### 1.2.2 Rendre le “workspace” natif (suppression du flag `--workspace`)

Objectif : supprimer la notion de “workdir/workspace cible” configurable, pour réduire le nombre de paramètres et éviter les ambiguïtés (chemins relatifs, patch `angular.json`, dist).

Décisions (figées) :
- Le workspace Angular est **toujours le CWD**.
- Le CLI refuse d’écrire si `angular.json` est absent dans le CWD.
- Le build de la lib écrit **toujours** sous `dist/<libName>` (comportement Angular standard), et `meridiane build` exécute `npm pack` dans `dist/<libName>`.

Travail à faire :
- [x] Supprimer tout code qui essaye de cibler un autre dossier que `process.cwd()` :
  - suppression des anciens flags/env `workspace` (ex: `MERIDIANE_DEV_WORKSPACE`) et des résolutions `path.resolve(process.cwd(), workspaceArg)`
  - suppression des wrappers “workspace absolu” (ex: logique `repoRoot`/`apps/sandbox` des commandes legacy)
- [x] Uniformiser les résolutions de chemins :
  - tous les chemins “cible” (projects/dist/angular.json) doivent être résolus depuis le CWD
  - les chemins “source package” (templates) doivent rester résolus depuis l’emplacement du package (`import.meta.url`)
- [x] Mettre à jour les scripts du repo pour exécuter Meridiane depuis le bon CWD :
  - sandbox : exécuter la commande dans `apps/sandbox` (ex: via `npm -w apps/sandbox run ...` ou via `cd apps/sandbox && ...`)
- [x] Vérifier manuellement :
  - exécuter `meridiane dev ...` depuis un dossier sans `angular.json` doit échouer avec un message d’erreur explicite

Critères d’acceptation :
- aucune option CLI ne permet de changer le workspace
- le CLI ne modifie jamais un `angular.json` hors du CWD
- l’expérience CI est triviale (il suffit de définir le working-directory sur la racine du workspace Angular)

### 1.2.3 Rendre la source OpenAPI explicite (suppression du flag `--backend`)

Objectif : supprimer le couple `--backend` + “path de spec” et ne garder qu’une seule source de vérité, pour réduire la combinatoire et les ambiguïtés.

Décisions (figées) :
- La spec est fournie uniquement via `--spec` sous 2 formes :
  - URL complète (`http(s)://…`)
  - fichier JSON local (`./openapi.json`)
- Aucun mode “chemin relatif au backend” (ex: `/api/docs.json`) n’est supporté.
- Le fallback `/api/docs.jsonopenapi` est appliqué uniquement quand `--spec` est une URL et qu’elle finit par `/api/docs.json`.

Pourquoi c’est mieux (DX + CI) :
- En CI, on connait déjà l’URL complète de l’environnement cible (staging/prod).
- En local, l’URL complète est simple à fournir, et un fichier JSON permet un workflow offline/reproductible.
- Ça évite les erreurs de concaténation (slashes, baseUrl, chemins relatifs) et simplifie le parsing.

Travail à faire :
- [x] Supprimer tout parsing “path vs URL vs concat baseUrl” : `--spec` décide tout.
- [x] Supprimer les variables d’environnement historiques liées au backend/spec (legacy) lors du nettoyage.
- [x] Mettre à jour la doc et les exemples (tous doivent passer une URL complète ou un fichier).
- [x] Vérifier manuellement :
  - `--spec /api/docs.json` (sans `http`) doit être traité comme un fichier et échouer si le fichier n’existe pas (message clair).

Critères d’acceptation :
- aucune option CLI ne prend un `baseUrl` backend
- `--spec` accepte seulement URL complète ou fichier JSON local
- le fallback fonctionne uniquement pour le cas URL `/api/docs.json`

### 1.2.4 Supprimer `flavor` et `hydra-base-*` (et la logique associée)

Objectif : enlever la complexité liée aux variantes `.jsonld/.jsonapi` et aux réglages Hydra “base”, et n’avoir qu’une logique simple pilotée par `--preset`.

Décisions (figées) :
- Il n’existe plus de flag `--flavor`/`--prefer-flavor` ni de logique de “choix de variante”.
- Il n’existe plus de flag `--hydra-base`/`--hydra-base-regex`.
- La sélection des schémas est uniquement :
  - `--preset=native` (ou `--preset` sans valeur) ⇒ filtres “native”
  - `--preset=all` ou absence de `--preset` ⇒ aucun filtre “native”
  - puis application `--include/--exclude`

Travail à faire :
- [x] Supprimer de `schema-utils.js` toute logique de déduplication/choix entre variantes (`jsonld/jsonapi/none`) :
  - retirer `preferFlavor` et les règles qui suppriment/choisissent des variantes
  - considérer chaque schéma comme distinct (selon son nom OpenAPI)
- [x] Supprimer `hydraBaseRegex` comme paramètre :
  - ignorer Hydra*BaseSchema lors du merge `allOf` (toujours), pour pouvoir générer des schémas “collection” basés sur `allOf`
  - en mode `native`, filtrer `^Hydra` + `jsonMergePatch` + variantes `.jsonld/.jsonapi`
  - en mode `all`, ne filtrer aucun schéma (mais on conserve l’aplatissement `allOf` quand il est sûr)
- [x] S’assurer que `--preset` est l’unique levier de filtrage automatique.

Critères d’acceptation :
- aucun flag `flavor`/`hydra-base-*` n’existe
- un schéma `.jsonld` et un schéma “sans suffixe” peuvent coexister et être générés quand `--preset` est absent/`all`
- en `--preset=native`, les schémas techniques sont filtrés (Hydra*, jsonMergePatch, variantes `.jsonld/.jsonapi`)

### 1.2.5 Naming stable en `--preset=all` (éviter collisions)

Objectif : quand `--preset=all` (ou absence de `--preset`), la spec contient souvent des variantes (`.jsonld`, `.jsonapi`, `.jsonMergePatch`, …) qui provoquent des collisions de noms TypeScript si on “strip” les suffixes.

Décisions (figées) :
- En `--preset=native` : on peut garder une stratégie “friendly” (on supprime les suffixes) car ces schémas sont filtrés.
- En `--preset=all` : on doit **encoder les suffixes** dans le nom TypeScript pour que :
  - `Conversation` ≠ `Conversation.jsonld` ≠ `Conversation.jsonMergePatch`
  - `User-user.read` ≠ `User.jsonld-user.read`

Règle de nommage (figée) en `--preset=all` :
- Point (`.`) dans le nom OpenAPI = séparation de tokens.
- Tiret (`-`) = séparation “base” / “groupe” (le groupe est aussi tokenisé).
- Les tokens spéciaux doivent être capitalisés sans ponctuation :
  - `jsonld` ⇒ `Jsonld`
  - `jsonapi` ⇒ `Jsonapi`
  - `jsonMergePatch` / `jsonmergepatch` ⇒ `JsonMergePatch`
- Le nom TypeScript final est en PascalCase en concaténant les tokens.

Exemples :
- `ConstraintViolation.jsonld` ⇒ `ConstraintViolationJsonld`
- `Conversation.jsonMergePatch` ⇒ `ConversationJsonMergePatch`
- `User.jsonld-user.read` ⇒ `UserJsonldUserRead`
- `User-user.read` ⇒ `UserUserRead`

Travail à faire :
- [x] Ajuster la fonction de naming (ex: `friendlyName()` / `buildNameMap()`), avec une policy dépendante du preset :
  - `native` : comportement actuel (strip)
  - `all` : conserver les suffixes en tokens explicites (ex: `Jsonld`, `Jsonapi`, `JsonMergePatch`)
- [x] Assurer la stabilité :
  - ordre déterministe (tri sur le nom original OpenAPI)
  - pas de suffixes numériques `Foo2` si on peut l’éviter

Critères d’acceptation :
- en `--preset=all`, les noms TS des variantes sont explicites et stables (pas de collisions masquées par `Foo2`)

### 1.2.6 Mettre à jour `tsconfig` paths (natif, sans flag)

Objectif : permettre d’importer le bridge par son `<packageName>` dans une app Angular du même workspace (ex: sandbox), sans config manuelle.

Décisions (figées) :
- Si un `tsconfig.json` existe au root du workspace (CWD) et contient `compilerOptions.paths`, Meridiane ajoute/maintient :
  - `<packageName>` → `./projects/<libName>/src/public-api.ts`
  - `<packageName>/*` → `./projects/<libName>/src/*`
- Si `compilerOptions.paths` n’existe pas, Meridiane le crée.

Travail à faire :
- [x] Détecter le fichier tsconfig racine :
  - priorité : `tsconfig.json`, sinon `tsconfig.base.json` (si présent)
- [x] Patcher `compilerOptions.paths` de manière idempotente.

Critères d’acceptation :
- après `meridiane dev …`, une app Angular du workspace peut faire `import {...} from '<packageName>'` sans config supplémentaire

### 1.3 Remplacer / supprimer l’ancien CLI (suppression totale des anciennes commandes)

À supprimer :
- commandes : `init`, `lib`, `models`, `dev-bridge`, `sandbox-bridge`
- bin secondaires : `meridiane-generate-lib`, `meridiane-generate-models`

Actions :
- [x] Supprimer les scripts `tools/init.js`, `tools/generate-lib.js`, `tools/generate-models.js`, `tools/dev-bridge.js`, `tools/sandbox-bridge.js` (ou les remplacer par les nouveaux tools puis supprimer)
- [x] Mettre à jour `packages/meridiane/package.json` :
  - `bin` ne contient plus que `meridiane`
  - `files` n’exporte plus les fichiers supprimés (`models.config.example.js`, etc.)

Critères d’acceptation :
- `meridiane --help` n’affiche que `dev` et `build`
- aucune ancienne commande n’existe (même indirectement)

### 1.4 Suppression de toute configuration externe (`.env`, `models.config.js`)

Objectif : aucune lecture automatique de `.env` et aucun chargement de `models.config.js`.

Actions :
- [x] Supprimer `tools/utils/dotenv.js` et enlever tous les `loadDotEnv()` / env vars associées
- [x] Supprimer le support `models.config.js` (plus d’import dynamique)
- [x] Supprimer `models.config.example.js` du package

Critères d’acceptation :
- les seules entrées de configuration sont les flags CLI (`--spec`, `--preset`, `--include`, `--exclude`, `--no-models`, `--version`, `--debug`, `<packageName>`)

### 1.4.1 Suppression de `init` (et des “fichiers starter”)

Objectif : supprimer la génération de fichiers “starter” qui ajoutent de l’état et des conventions à maintenir (et qui entrent en conflit avec l’objectif “tout en CLI”).

Décisions (figées) :
- Il n’existe plus de commande `init`.
- Aucun fichier généré hors `projects/<libName>` (pas de `.env.example`, pas de dossier `meridiane/`, pas de `models.config.js`).
- Toute configuration nécessaire doit être passée en flags CLI au moment de l’exécution (`dev` ou `build`).

Travail à faire :
- [x] Supprimer `tools/init.js` et le routage correspondant dans `cli.js`.
- [x] Nettoyer la doc qui mentionne `init` et les fichiers générés.
- [x] Adapter les workflows internes (sandbox/doc) pour ne plus dépendre de ces fichiers.

Critères d’acceptation :
- aucun fichier n’est créé à la racine du workspace (en dehors de `projects/<libName>` et `angular.json`)
- `meridiane --help` ne mentionne pas `init`

---

## 2) Nettoyage repo (scripts, docs, CI)

### 2.1 Mettre à jour les scripts npm du repo

Racine `package.json` :
- [x] Remplacer `sandbox:*` pour utiliser la nouvelle commande `meridiane dev`
  - exemple : `npm run sandbox:bridge` doit exécuter la commande dans `apps/sandbox` (CWD = workspace Angular), puis :
    - `node ../../packages/meridiane/cli.js dev @obsidiane/bridge-sandbox --spec http://localhost:8000/api/docs.json`

`apps/sandbox/package.json` :
- [x] Remplacer `bridge:template` / `bridge:sync` par une seule commande basée sur `meridiane dev`

Critères d’acceptation :
- le sandbox continue de fonctionner sans anciennes commandes

### 2.2 Mettre à jour la documentation

À faire :
- [x] `README.md` (racine) : ne documenter que `dev` et `build`
- [x] `docs/utilisation/cli.md` : ne documenter que `dev` et `build` + expliquer la dérivation `libName`
- [x] Supprimer ou réécrire les docs obsolètes :
  - `docs/utilisation/configuration.md` (référence `.env`/`models.config.js`)
  - sections `init/lib/models/dev-bridge/sandbox-bridge`

Critères d’acceptation :
- aucune page doc ne mentionne `.env`, `models.config.js`, `init`, `dev-bridge`, `sandbox-bridge`

### 2.3 Mettre à jour la CI GitHub Actions

`.github/workflows/ci.yml` :
- [x] Remplacer “CLI help” par vérification des 2 commandes :
  - `node packages/meridiane/cli.js --help` doit lister `dev` et `build`
  - (option) exécuter un `dev` sur un spec fixture locale (si ajoutée en tests)

`.github/workflows/publish-npm.yml` :
- [x] Garder la stratégie de version via tag
- [x] S’assurer que le package publié ne contient que le nécessaire

Critères d’acceptation :
- CI passe et protège le contrat “2 commandes only”

### 2.4 Hygiène repo (nettoyage artefacts)

Objectif : éviter de versionner des artefacts lourds/instables dans ce repo d’outil.

À faire :
- [x] Retirer `apps/backend/bolt.db` du git et l’ajouter au `.gitignore` (et/ou le gérer via volume Docker).

Critères d’acceptation :
- plus de DB locale/versionnée qui pollue les diffs et les PR

---

## 3) Packaging npm (attendu)

Résultat attendu du package publié `@obsidiane/meridiane` :
- `bin: meridiane`
- contient :
  - `cli.js`
  - `tools/**` nécessaires à `dev`/`build`
  - `templates/**`
  - `README.md`
- ne contient pas :
  - `.env` / chargeur dotenv
  - `models.config.example.js`
  - anciens outils/commandes

---

## 4) Critères d’acceptation globaux (Definition of Done)

- `npx -y @obsidiane/meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json` régénère la lib + models.
- `npx -y @obsidiane/meridiane build @acme/backend-bridge --version 1.2.3 --spec https://staging.example/api/docs.json` produit :
  - `dist/<libName>/…`
  - un `.tgz` via `npm pack` dans `dist/<libName>`
- Le help n’expose que `dev` et `build`.
- Aucune lecture de `.env` et aucun fichier de config.
