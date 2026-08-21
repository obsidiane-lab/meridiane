# Architecture du dépôt

Meridiane est organisé autour d'un produit publié et d'un environnement de développement séparé.

## Produit publié

`packages/meridiane/` contient exclusivement ce qui est nécessaire au CLI et aux bridges générés :

- `cli.js` : point d'entrée stable de la commande `meridiane` ;
- `src/application/` : orchestration des commandes `generate`, `dev` et `build` ;
- `src/domain/` : normalisation des options et règles indépendantes des entrées/sorties ;
- `src/infrastructure/` : fichiers, processus, chargement OpenAPI et workspace de build ;
- `src/generators/` : transformation OpenAPI vers les modèles TypeScript ;
- `templates/angular-bridge/` : runtime Angular copié dans chaque bridge généré.

Les commandes, arguments et options du CLI constituent le contrat d'utilisation. Les dossiers sous `src/` restent internes.

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
