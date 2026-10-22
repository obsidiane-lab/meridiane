# Stores par IRI

Chaque store conserve les ressources de son entité sous forme de `Signal<EntityResource<T>>`, indexées par IRI API Platform. Il n'effectue aucun appel HTTP et ne résout aucune relation.

- `entity(iri)` donne le signal de la ressource et de son état.
- `upsert` conserve le JSON natif complet reçu par le repository.
- `remove` marque la ressource supprimée et retire sa valeur affichable.
- Les états de chargement et d'erreur sont pilotés par le repository.

`Conversation.messages` reste une liste d'IRI. `Message.conversation` reste une IRI. Les objets liés vivent uniquement dans leurs stores respectifs ; les services composent leurs signaux à la demande.

La liste des entités connues du cache ne remplace pas les membres d'une réponse de collection serveur. Après rechargement, seules les IRI de la collection reçue déterminent les lignes affichées.

HTTP et Mercure alimentent le même store avec les ressources natives. Le repository utilise `isResourceDeletion` pour reconnaître un payload de suppression et appeler `remove` avec son `@id`, puis `upsert` pour les ressources complètes.
