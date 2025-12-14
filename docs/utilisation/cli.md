# CLI Meridiane

Cette page fait partie des docs d’utilisation.

Le CLI sert à générer un bridge Angular (lib) et (optionnellement) ses modèles TypeScript depuis une spec OpenAPI (API Platform).
Cette page décrit ce que chaque commande **écrit** dans votre workspace Angular (CWD = dossier contenant `angular.json`).

## `meridiane dev`

Génère (ou régénère) le bridge pour le développement.

La commande écrit principalement :

- `projects/<libName>` (sources du bridge, générées depuis le template embarqué)
- `projects/<libName>/src/models/*` (si models activés)
- une entrée `projects.<libName>` dans `angular.json` (build/test Angular)

Usage :

```bash
meridiane dev <packageName> --spec <url|file> [--preset[=native|all]] [--include <substr>]... [--exclude <substr>]... [--no-models] [--debug]
```

Notes :

- `<packageName>` est le nom npm du bridge (ex: `@acme/backend-bridge`).
  `libName` est dérivé de `<packageName>` (ex: `backend-bridge`) et sert au dossier `projects/<libName>`.
- `--preset` par défaut est `all` (si absent). Si `--preset` est présent sans valeur, il vaut `native`.
- `--preset=native` vise des modèles “entity-like” (ex: `User`, `Conversation`, `ConstraintViolation`).
- `--preset=all` garde toutes les variantes (ex: `ConstraintViolationJsonld`, `ConversationJsonMergePatch`, …).
- Tous les models générés étendent `Item` (type local au bridge).

## `meridiane build`

Commande CI/CD : génère le bridge, build la lib Angular, puis produit un artefact npm (`npm pack`).

```bash
meridiane build <packageName> --version <semver> --spec <url|file> [--preset[=native|all]] [--include <substr>]... [--exclude <substr>]... [--no-models] [--debug]
```

La commande écrit principalement :

- `projects/<libName>` (sources du bridge)
- `dist/<libName>` (sortie `ng build`)
- un `.tgz` via `npm pack` (dans `dist/<libName>`)

## Debug

Le flag `--debug` active des logs supplémentaires côté CLI.
