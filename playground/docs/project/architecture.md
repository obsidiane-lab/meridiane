# Architecture du playground

Le backend `core/` expose `Conversation` et `Message` avec API Platform. Le frontend `webfront/` consomme les modèles et les façades générés par la CLI locale de Meridiane.

Les ressources restent proches des entités Symfony, sans groupes de sérialisation par écran. Une conversation contient les IRI de ses messages ; un message conserve l'IRI de sa conversation. Les relations sont chargées individuellement à la demande.

| Couche frontend | Responsabilité |
| --- | --- |
| Store | Ressources natives indexées par IRI et signaux d'état. |
| Repository | Requêtes HTTP, abonnements Mercure et synchronisation du store. |
| Service | Actions applicatives, agrégation et chargement des relations. |
| Composant | Actions utilisateur et lecture des signaux. |

Les réponses HTTP et les payloads natifs Mercure alimentent les mêmes stores. Le repository conserve directement la ressource complète avec `upsert` ; un payload reconnu par `isResourceDeletion` retire la ressource par son `@id`. Les abonnements sont libérés avec leurs consommateurs.

Le choix des topics et la publication d'une conversation actualisée après une mutation de ses messages appartiennent au backend de cette application de test. Meridiane transporte et route les événements ; il ne reconstruit pas les relations métier.

Le playground est anonyme et destiné au développement local. Les fonctions de connexion Foundation et l'entité Project ont été retirées.

Caddy expose le frontend, `/api` et le hub sous une même origine. `assets/config.json` fournit la configuration runtime au navigateur. `webfront/bridge/` est régénéré uniquement par `make bridge`, sans édition manuelle.
