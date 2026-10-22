# Bridge du playground

`make bridge`, depuis `playground/`, génère `webfront/bridge/` avec les sources locales Meridiane et le contrat API Platform Conversation/Message.

Le frontend conserve ses ressources par IRI. Le repository synchronise les réponses HTTP et les payloads natifs Mercure dans le store : `isResourceDeletion` reconnaît une suppression à appliquer par `@id`, sinon la ressource complète passe à `upsert`. Le service compose les relations à la demande ; le composant lit les signaux.

Un abonnement `watch$(iri)` suit une entité, `watch$()` suit une ressource. La désinscription RxJS suffit à libérer les écoutes. Les suppressions reçues de l'autre client retirent l'entité du store.

Voir [la documentation actuelle du bridge](../../../docs/guide-bridge.md), [du temps réel](../../../docs/fonctionnalites/mercure-sse.md) et [le README playground](../../README.md).
