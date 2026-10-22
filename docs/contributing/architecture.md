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

- `oas-contract.js` suit les dépendances `$ref` entre schémas ;
- `model-selection.js` sélectionne les schémas de `components.schemas` (filtres `--include` / `--exclude`), puis attribue les noms TypeScript en fusionnant les représentations de même forme d'une ressource ;
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
- `bridge/sse/` implémente Mercure 1.0 : connexion unique partagée (`mercure-hub.ts`), URL d'abonnement et routage des updates vers les ressources (`resource-topic.ts`) ;
- `facades/` fournit les opérations HTTP et les abonnements par ressource ou par IRI consommés par les applications Angular ;
- `ports/` décrit les contrats internes entre facades et adaptateurs.

Seuls les symboles réexportés par `public-api.ts` appartiennent au contrat public du bridge.

### Frontière avec l'application consommatrice

Meridiane garde une approche « entity first » : les modèles suivent le contrat OpenAPI et
les ressources HTTP/Mercure conservent leur représentation JSON, y compris les relations
par IRI. Le bridge ne résout pas les relations et ne stocke pas les entités.

Dans une application telle que Foundation, le repository appelle le bridge et applique
les réponses HTTP et les ressources JSON reçues par Mercure au store à signaux.
Il utilise `isResourceDeletion()` pour retirer du store une ressource supprimée.
Les services composent les données et portent la logique métier ; les composants
lisent les signaux.
Le développeur configure les publications et les topics API Platform nécessaires à la
cohérence entre entités, ainsi que le chargement différé des relations.

## Environnement de développement

`playground/` ne fait pas partie du produit publié :

- `core/` est l'API Symfony / API Platform de référence ;
- `webfront/` est l'application Angular de validation manuelle ;
- `README.md` documente le workflow commun.

Le playground peut dépendre du générateur. Le générateur ne doit jamais dépendre du playground.

## Validation

Aucun test unitaire n'est utilisé dans ce dépôt. Ne pas en créer, en ajouter ni en
régénérer, et ne pas ajouter de dépendance dédiée aux tests unitaires.

La CI et la release vérifient la compilation du bridge et des modèles depuis
`examples/entity-first.openapi.json`, puis le contenu du package npm. Ces contrôles
peuvent être lancés depuis la racine :

```bash
node packages/meridiane/cli.js build @obsidiane/check-bridge --version 0.0.0 --spec examples/entity-first.openapi.json
npm -w packages/meridiane run pack:check
```

Pour le playground, lancer les contrôles adaptés depuis `playground/` :

- `make bridge` pour régénérer le bridge depuis le contrat backend ;
- `make lint` et `make build` pour le frontend ;
- `make phpstan` pour l'analyse statique du backend ;
- des vérifications ciblées dans le navigateur pour les parcours HTTP et Mercure,
  avec deux clients lorsque la synchronisation temps réel est concernée.

## Documentation

`docs/` décrit le produit et son API publique. Les informations propres au développement du dépôt vivent sous `docs/contributing/` ou `playground/`.
