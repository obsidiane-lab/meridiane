# @app/bridge

Bridge Angular de l'API, généré par [Meridiane 3](https://github.com/obsidiane-lab/meridiane/blob/master/docs/README.md) depuis son contrat OpenAPI. Ne pas modifier : régénérer quand le contrat change.

Il fournit les modèles TypeScript, le client HTTP (JSON-LD, Hydra, merge-patch) et le temps réel Mercure 1.0. Angular 20, 21 ou 22 ; RxJS 7.8.

## Configurer

```ts
import {provideBridge} from '@app/bridge';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBridge({
      baseUrl: '/',                                        // API sur la même origine que le front
      mercure: {
        hubUrl: '/.well-known/mercure',
        authorize: '/api/mercure/authorization',           // pose et renouvelle le cookie Mercure
      },
    }),
  ],
};
```

`provideBridge()` installe `HttpClient`. Options, cookies et topologies : [Configuration](https://github.com/obsidiane-lab/meridiane/blob/master/docs/configuration.md).

## Utiliser une ressource

```ts
import {FacadeFactory, isResourceDeletion, type Project} from '@app/bridge';

const projects = inject(FacadeFactory).create<Project>({url: '/api/projects'});

projects.getCollection$({page: 1, itemsPerPage: 20});   // Collection<Project>
projects.get$('/api/projects/42');                       // Project
projects.post$({name: 'Refonte'});
projects.patch$('/api/projects/42', {archived: true});
projects.delete$('/api/projects/42');

projects.watch$().subscribe((resource) => {             // toute la ressource, en direct
  if (isResourceDeletion(resource)) store.remove(resource['@id']);
  else store.upsert(resource);
});
```

Pour un endpoint hors ressource ou un topic Mercure personnalisé : `BridgeFacade`.

## Documentation

[Démarrage](https://github.com/obsidiane-lab/meridiane/blob/master/docs/demarrage.md) ·
[HTTP](https://github.com/obsidiane-lab/meridiane/blob/master/docs/http.md) ·
[Temps réel](https://github.com/obsidiane-lab/meridiane/blob/master/docs/temps-reel.md) ·
[Backend](https://github.com/obsidiane-lab/meridiane/blob/master/docs/backend.md) ·
[Recettes](https://github.com/obsidiane-lab/meridiane/blob/master/docs/recettes.md) ·
[Référence](https://github.com/obsidiane-lab/meridiane/blob/master/docs/reference.md) ·
[Dépannage](https://github.com/obsidiane-lab/meridiane/blob/master/docs/depannage.md)

---

## Documentation du projet

# Playground Meridiane

Application de test reconstruite depuis [Foundation](https://gitlab.com/angryblackbird/foundation), commit `fecf8e7`. Elle conserve Symfony/API Platform, Angular 22 et Spartan UI ; la connexion, User, Project et les anciennes migrations ont été retirés.

Le but est de valider le bridge local Meridiane 3.0 avec Mercure 1.0 : ressources natives, relations par IRI, repositories, stores à signaux, services et composants.

## Démarrage

Prérequis : Docker Compose, Node 24.15+ et npm 11+. Les dépendances du générateur doivent être installées à la racine du dépôt (`npm ci`).

Depuis `playground/` :

```bash
make init
```

Cette commande démarre la stack, prépare le schéma Conversation/Message dans sa base dédiée, crée une conversation avec deux messages si aucune conversation n'existe, puis génère le bridge avec les sources locales du dépôt. Elle ne réinitialise pas une base existante.

- Application via Caddy : <http://localhost:8000/conversations>.
- Serveur Angular direct : <http://localhost:4200/conversations>.
- Documentation API : <http://localhost:8000/api/docs>.
- Hub Mercure : <http://localhost:8000/.well-known/mercure>.
- Autorisation Mercure : <http://localhost:8000/api/mercure/authorization> pose le cookie abonné (`mercure_access_token`, durée `MERCURE_SUBSCRIBER_TTL`, 600 s par défaut). Le hub refuse les abonnés sans cookie : le bridge l'obtient via `mercure.authorize` et le renouvelle 5 secondes avant `expiresIn`. La configuration suit la [configuration de référence](../docs/backend.md).

La configuration de développement est fournie dans `compose.yaml`, sans fichier `.env` ni fournisseur de connexion à configurer. Le projet Compose `meridiane-playground` utilise ses propres volumes. Cette application sans compte utilisateur est réservée aux tests locaux.

## Bridge et contrôles

Depuis `playground/` :

```bash
make bridge
make lint
make build
make phpstan
```

`make bridge` exporte le contrat OpenAPI du backend et appelle `../packages/meridiane/cli.js` pour régénérer `webfront/bridge/`. Le générateur vient des sources locales, pas du registre npm. Ne pas modifier le bridge à la main.

`make check` réunit lint, build et PHPStan. `make down` arrête la stack sans supprimer les volumes.

## Parcours de validation

Ouvrir deux onglets sur l'application et garder les requêtes réseau visibles pour les contrôles de chargement.

| Parcours | Résultat attendu |
| --- | --- |
| Sélectionner une conversation | Réutilisation de sa ressource native ou GET par IRI, puis GET individuel des messages manquants. |
| Charger un message par son IRI | Le message garde une IRI de conversation ; cette conversation peut être chargée et affichée ensuite. |
| Revenir sur une ressource déjà chargée | Les ressources connues sont réutilisées ; les entités liées restent dans leurs stores respectifs. |
| Créer ou modifier depuis le second onglet | Les événements Mercure alimentent les stores ; les signaux actualisent l'autre écran. |
| Ajouter ou supprimer un message | Le backend publie aussi la conversation actualisée ; sa liste d'IRI reflète la relation courante. |
| Supprimer depuis le second onglet | Le payload natif de suppression, reconnu par `isResourceDeletion`, retire l'entité du store par son `@id`. |
| Désactiver le temps réel, modifier ailleurs, puis recharger | Le rafraîchissement explicite récupère les valeurs courantes, y compris les messages déjà connus. |
| Supprimer une conversation ailleurs puis recharger la liste | La conversation absente de la réponse ne reste pas affichée à cause du cache. |
| Changer de sélection et désactiver le temps réel | Les écoutes devenues inutiles sont libérées ; les diagnostics permettent de suivre la connexion. |

La publication des topics et la cohérence Conversation/Message sont des règles de cette application de test. Meridiane assure le typage, HTTP et le temps réel ; il ne reconstruit pas les relations métier.

## Structure

- `core/` : entités et API Platform, publication Mercure, commande `app:seed`.
- `webfront/` : frontend Foundation et parcours Conversation/Message.
- `webfront/bridge/` : types et runtime générés avec les commandes locales Meridiane.
- `@obsidiane/` : runtime Caddy/FrankenPHP et configuration Angular.

Le socle `.agents/` et `.codex/` de Foundation est conservé. Ses exemples génériques ne décrivent pas les fonctionnalités installées dans le playground. La licence Foundation d'origine est conservée dans [LICENSE](LICENSE).
