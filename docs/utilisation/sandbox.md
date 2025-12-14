# Sandbox (repo Meridiane)

Ce repo contient une app Angular de dev (`apps/sandbox`) utilisée pour tester :

- la lib bridge générée (runtime HTTP + Mercure/SSE)
- la génération des modèles (OpenAPI)
- des patterns d’intégration côté app (stores / repositories / facades)

## Règle importante

`apps/sandbox/projects/bridge-sandbox` est **généré**.  
Il ne faut pas modifier ces fichiers à la main : tout part du template `packages/meridiane/templates/_lib_template`.

## Mettre à jour le bridge utilisé par le sandbox

Commande “dev” (contacte le backend et régénère la lib + les models) :

```bash
npm run sandbox:bridge
```

Dans ce repo, `meridiane dev` est préconfigurée pour mettre à jour `projects/bridge-sandbox` :
- `packageName` par défaut : `@obsidiane/bridge-sandbox`
- `--spec` par défaut : `http://localhost:8000/api/docs.json`
- `--preset` par défaut : `native` (évite de générer des schémas “techniques”, ex: `jsonMergePatch`)

Exemples (depuis `apps/sandbox`) :

```bash
# Bridge + models depuis le backend local (valeurs par défaut)
node ../../packages/meridiane/cli.js dev

# Bridge uniquement (pas besoin de backend)
node ../../packages/meridiane/cli.js dev --no-models
```

## Lancer le sandbox

```bash
npm run sandbox:dev
```

Le script `sandbox:dev` s’appuie sur la synchro du bridge (via le CLI) avant de lancer Angular.

## Patterns côté app

Le sandbox adopte le pattern :

- `Store` (signals) : source de vérité locale, indexée par `Item['@id']`
- `Repository` : instancie la `ResourceFacade<T>`, appelle le HTTP/SSE, et met à jour le store via `tap()`
- `Component` : consomme uniquement le repository + signals (pas de logique HTTP/Mercure directe)

Objectif : garder un front découplé, testable et aligné avec une API Platform “relations = IRIs”.
