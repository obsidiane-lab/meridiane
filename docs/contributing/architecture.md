# Architecture du dépôt

Meridiane est organisé autour d'un produit publié et d'un environnement de développement séparé.

## Produit publié

`packages/meridiane/` contient exclusivement ce qui est nécessaire au CLI et aux bridges générés :

- `cli.js` : point d'entrée stable de la commande `meridiane` ;
- `src/application/` : orchestration des commandes `generate`, `dev` et `build` ;
- `src/domain/` : normalisation des options et règles indépendantes des entrées/sorties ;
- `src/infrastructure/` : fichiers, processus, chargement OpenAPI et installation locale ;
- `src/generators/` : transformation OpenAPI vers les modèles TypeScript ;
- `templates/angular-bridge/` : runtime Angular copié dans chaque bridge généré.

Le toolchain Angular utilisé par `dev` et `build` est une dépendance explicite de Meridiane. La
configuration de compilation se trouve dans le template du bridge : aucun `package.json`, `tsconfig`
ou `npm install` supplémentaire n'est généré pendant une commande.

Les commandes, arguments et options du CLI constituent le contrat d'utilisation. Les dossiers sous `src/` restent internes.

### Compilation OpenAPI

Le compilateur de modèles suit un pipeline unidirectionnel. Chaque module porte une seule décision :

- `oas-contract.js` trouve les schémas atteignables depuis les opérations OpenAPI ;
- `model-selection.js` applique les formats et filtres, puis attribue les noms TypeScript ;
- `interface-schema.js` décide si un schéma objet peut rester une interface sans perte de sens ;
- `type-resolver.js` traduit récursivement un schéma en expression TypeScript ;
- `type-expression.js` compose les unions, intersections et tableaux avec leur priorité syntaxique ;
- `openapi-to-models.js` orchestre ces étapes et produit les définitions destinées aux templates ;
- `write-model-files.js` se limite au rendu et à l'écriture des fichiers.

Les particularités d'un projet consommateur ne doivent jamais entrer dans ce pipeline. Une règle de
génération doit découler d'OpenAPI, de JSON Schema ou d'un comportement historique explicitement
préservé par le contrat de Meridiane.

### Runtime Angular généré

Le template Angular sépare les responsabilités techniques sans exposer ces détails dans l'API publique :

- `provide-bridge.ts` assemble la configuration et les providers ;
- `interceptors/` porte les règles HTTP transverses, dont l'authentification limitée à l'API configurée ;
- `bridge/rest/` adapte les appels HTTP à API Platform ;
- `bridge/sse/` orchestre Mercure et isole la gestion des connexions, des abonnements et des payloads ;
- `facades/` fournit l'API métier consommée par les applications Angular ;
- `ports/` décrit les contrats internes entre facades et adaptateurs.

Seuls les symboles réexportés par `public-api.ts` appartiennent au contrat public du bridge.

## Environnement de développement

`playground/` ne fait pas partie du produit publié :

- `api-platform/` est l'API Symfony de référence ;
- `angular-app/` est l'application de validation manuelle ;
- `README.md` documente le workflow commun.

Le playground peut dépendre du générateur. Le générateur ne doit jamais dépendre du playground.

## Documentation

`docs/` décrit le produit et son API publique. Les informations propres au développement du dépôt vivent sous `docs/contributing/` ou `playground/`.
