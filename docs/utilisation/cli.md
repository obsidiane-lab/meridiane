# CLI Meridiane

Cette page fait partie des docs d’utilisation.

Le CLI sert à générer le bridge et ses modèles, à partir d’un template et d’une spec OpenAPI.
Cette page décrit ce que chaque commande **écrit** dans votre workspace.

## `meridiane init`

Crée des fichiers “starter” dans le workspace courant.
Le but est de centraliser les réglages et de réduire la répétition des flags.

Sorties typiques :

- `models.config.js` : defaults de génération des models
- `.env.example` : exemple de variables d’environnement pour le CLI
- `meridiane/angular.example.ts` : snippet d’intégration `provideBridge(...)`

Options :

- `--force` : régénère/écrase les fichiers

## `meridiane lib`

Génère une lib Angular “bridge” à partir du template embarqué.
La commande crée/écrit principalement :

- `projects/<lib-name>` (sources du bridge)
- une entrée `projects.<lib-name>` dans `angular.json` (build/test Angular)
- `package.json` de la lib (name/version, publishConfig si configuré)

Usage :

```bash
meridiane lib <lib-name> <npm-package-name> [version] [url-registry]
```

Notes :

- le registry est de préférence géré via `.npmrc` / variables CI
- le build d’une lib Angular nécessite `ng-packagr` dans le workspace

## `meridiane models`

Génère des interfaces TypeScript depuis une spec OpenAPI (URL http(s) ou fichier JSON).
La commande écrit un fichier par modèle et un `index.ts` optionnel.

Usage :

```bash
meridiane models <SPEC_OPENAPI_URL_OU_FICHIER_JSON> [--out=<dir>] [--item-import=<path>] [--required-mode=all-optional|spec] [--preset=all|native] [--include=<substr>] [--exclude=<substr>] [--index=1|0]
```

Points clés :

- `--out` est relatif au CWD
- `--required-mode=spec` respecte `required` dans la spec
- `--preset=native` retire les schémas “techniques” (Hydra*, jsonMergePatch…)
- `--include/--exclude` filtrent les schémas (sur leurs noms OpenAPI)
- `--index=1` (défaut) génère `index.ts` ; `--index=0` le désactive

## `meridiane dev-bridge`

Commande “confort dev” : génère la lib et les modèles en une seule commande, en allant chercher la spec OpenAPI sur un backend (localhost par défaut).

Usage :

```bash
meridiane dev-bridge <lib-name> <npm-package-name> [version] [--workspace=<dir>] [--backend=<url>] [--spec=<path|url>] [--models-out=<dir>] [--no-models]
```

## `meridiane sandbox-bridge`

Commande “confort dev” dédiée à ce repo : met à jour **directement** le bridge utilisé par le sandbox (`apps/sandbox/projects/bridge-sandbox`) et (optionnellement) les models.

Usage :

```bash
meridiane sandbox-bridge [--backend=http://localhost:8000] [--spec=/api/docs.json] [--no-models]
```

Note : `sandbox-bridge` est surtout utile dans ce repo (Meridiane) car il cible `apps/sandbox` par défaut.

## Debug

Le flag `--debug` active des logs supplémentaires côté CLI.
Il est équivalent à `MERIDIANE_DEBUG=1`.
