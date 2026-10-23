# CLI

```bash
npx @obsidiane/meridiane@3 <commande> <packageName> [options]
```

Node.js ≥ 24. Le `packageName` (ex. `@app/bridge`) devient le nom du package généré.

## Le contrat OpenAPI

Le CLI lit le contrat que publie API Platform. Deux façons de le fournir à `--spec` :

```bash
# Un fichier exporté par Symfony : ne demande pas d'API joignable
docker compose exec php bin/console api:openapi:export --output=openapi.json

# L'URL du contrat, servie par défaut par API Platform 5
--spec https://api.example.com/api/docs.jsonopenapi
```

Le fichier est le plus simple en développement, où l'API tourne sur `https://localhost` avec un certificat local que Node.js ne reconnaît pas, et en CI.

## Quelle commande ?

| Commande | Produit | Quand l'utiliser |
|---|---|---|
| `generate` | les sources du bridge dans le projet | Le bridge vit dans le dépôt de l'application (cas le plus simple) |
| `build` | un package compilé et son `.tgz` dans `dist/` | Publier le bridge sur un registre npm (CI) |
| `dev` | le package compilé, installé dans `node_modules` | Tester un bridge compilé localement, sans registre |

### `generate`

```bash
npx @obsidiane/meridiane@3 generate @app/bridge --spec ../api/openapi.json --out bridge
```

Écrit les sources dans `--out` (par défaut `projects/<nom>`). L'application les compile grâce à un alias dans `tsconfig.json` (`"@app/bridge": ["./bridge/src/public-api"]`). Le dossier est entièrement réécrit à chaque génération.

Le README du dossier courant est ajouté à la fin du README du bridge.

### `build`

```bash
npx @obsidiane/meridiane@3 build @acme/api-bridge --version 1.4.0 --spec ./openapi.json
npm publish dist/api-bridge
```

Compile le bridge (ng-packagr, mode partiel) dans `dist/<nom>/` et le compresse en `.tgz`. Le package est consommable par Angular 20, 21 et 22.

La compilation utilise l'Angular, le RxJS et le TypeScript du CLI : le projet courant n'a pas besoin de `node_modules`, ni de `npm ci` en CI.

### `dev`

```bash
npx @obsidiane/meridiane@3 dev @acme/api-bridge --spec ../api/openapi.json
```

À lancer depuis la racine de l'application. Compile comme `build`, copie le package dans `node_modules/@acme/api-bridge`, puis vide le cache Vite d'Angular pour ce package. La version est fixée à `0.0.0-dev`.

## Options

| Option | Commandes | Rôle |
|---|---|---|
| `--spec <url\|fichier>` | toutes | Contrat OpenAPI. Obligatoire sauf avec `--no-models`. |
| `--include <texte>` | toutes | Ne génère que les schémas dont le nom contient ce texte (répétable, ou liste séparée par des virgules). Leurs dépendances sont incluses. |
| `--exclude <texte>` | toutes | Exclut les schémas dont le nom contient ce texte. |
| `--no-models` | toutes | Runtime seul, sans modèles. |
| `--version <semver>` | `generate`, `build` | Version du package généré (défaut `0.0.0`). |
| `--out <dossier>` | `generate` | Dossier de sortie. |
| `--debug` | toutes | Journaux détaillés. |

Si une URL se terminant par `/api/docs.json` échoue, le CLI essaie aussi `/api/docs.jsonopenapi`.

Les modèles produits sont décrits dans [Fonctionnement](fonctionnement.md#les-modèles).

## En CI

```yaml
# GitHub Actions : publier le bridge à chaque tag
- run: php bin/console api:openapi:export --output=openapi.json
- run: npx @obsidiane/meridiane@3 build @acme/api-bridge --version ${GITHUB_REF_NAME#v} --spec ./openapi.json
- run: npm publish dist/api-bridge
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
