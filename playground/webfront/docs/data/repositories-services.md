# Repositories et services

Le repository est la seule couche de feature qui parle au bridge et synchronise le store. Le service expose les signaux et les actions aux composants, puis compose les relations utiles.

## Lecture

Le store conserve une ressource `EntityResource<T>` par IRI, avec sa valeur et son état. Le repository déclenche le chargement d'une ressource absente, puis applique le JSON natif reçu. Les erreurs et l'état `loading` restent explicites.

Les relations sont chargées par leur propre repository. Une conversation garde `messages: Iri[]` ; les objets Message ne sont pas copiés dans Conversation. Les composants affichent les signaux des ressources liées à mesure qu'elles arrivent.

Une collection serveur et le cache d'entités ont des rôles différents : la réponse courante détermine les membres affichés. Une entité conservée dans le cache ne doit pas réapparaître dans une liste qui ne la contient plus. Un rechargement explicite rafraîchit aussi les entités connues.

## Écritures et temps réel

La façade expose `watch$(iri)` pour une entité et `watch$()` pour les ressources de cette façade. Les événements sont des `ResourceEvent<T>` :

- `upsert` : placer la ressource complète dans le store ;
- `delete` : retirer la ressource par son IRI.

Les réponses HTTP de mutation alimentent aussi le store pour confirmer l'action locale. Les événements Mercure maintiennent les autres clients à jour. Appliquer deux fois la même représentation reste sans effet métier supplémentaire.

La désinscription est portée par l'abonnement RxJS (`unsubscribe`, `takeUntilDestroyed` ou cleanup d'effet). Il n'y a plus d'appel `facade.unwatch()`.

La cohérence des relations et les topics publiés relèvent du backend de l'application. Le service frontend charge les IRI présentes dans les ressources ; il ne demande pas au bridge de fabriquer une conversation enrichie.

La référence d'API est [la documentation Mercure du dépôt](../../../../docs/fonctionnalites/mercure-sse.md).
