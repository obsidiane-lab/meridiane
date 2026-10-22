# Architecture frontend

| Couche | Responsabilité |
| --- | --- |
| Store | État des ressources natives par IRI et signaux `EntityResource<T>`, sans HTTP. |
| Repository | Façades générées, requêtes, abonnements et mise à jour des stores. |
| Service | Actions métier et composition des relations à la demande. |
| Composant | Présentation, interactions et lecture des signaux. |

Une conversation conserve ses IRI de messages. Chaque message est chargé individuellement via son service et reste dans son propre store. Le chargement d'un message seul permet de récupérer ensuite sa conversation par IRI.

Les repositories appliquent les réponses HTTP et les événements Mercure aux mêmes stores : `upsert` conserve la représentation complète, `delete` retire l'entité par IRI. Les composants se mettent à jour par leurs signaux.

Une liste serveur conserve la liste d'IRI de sa réponse courante. Le cache peut connaître d'autres entités, sans les ajouter automatiquement à cette liste. Un rechargement explicite doit réellement rafraîchir les données déjà présentes.

RxJS porte HTTP et SSE ; Angular Signals porte l'état affiché. Les abonnements sont bornés par le cycle de vie des consommateurs. Le bridge ne résout pas les relations métier.

Les pages utilisent les primitives Spartan existantes. Leur convention reste dans [spartan.md](../ui/spartan.md). `webfront/bridge/` et `shared/ui/` restent des sorties générées.
