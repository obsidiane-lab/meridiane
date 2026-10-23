# Stores par IRI

Chaque store conserve les ressources de son entité ligne par ligne : une `Map` d'IRI API Platform vers un `WritableSignal<EntityResource<T>>`. Modifier une entité ne notifie que les lecteurs de sa ligne. Le store n'effectue aucun appel HTTP et ne résout aucune relation.

- `entity(iri)` rend toujours le même signal pour une IRI ; la ligne est créée à la première lecture (`idle`) sans écriture de signal, donc lisible depuis un template ou un `computed`.
- `entities()` liste les valeurs des lignes écrites.
- `setAll`, `clear` et `forget` repassent les lignes à `idle` : les signaux déjà lus par les composants restent valides.

- `entity(iri)` donne le signal de la ressource et de son état.
- `upsert` conserve le JSON natif complet reçu par le repository.
- `remove` marque la ressource supprimée et retire sa valeur affichable.
- Les états de chargement et d'erreur sont pilotés par le repository.

`Conversation.messages` reste une liste d'IRI. `Message.conversation` reste une IRI. Les objets liés vivent uniquement dans leurs stores respectifs ; les services composent leurs signaux à la demande.

La liste des entités connues du cache ne remplace pas les membres d'une réponse de collection serveur. Après rechargement, seules les IRI de la collection reçue déterminent les lignes affichées.

HTTP et Mercure alimentent le même store avec les ressources natives. Le repository utilise `isResourceDeletion` pour reconnaître un payload de suppression et appeler `remove` avec son `@id`, puis `upsert` pour les ressources complètes.
