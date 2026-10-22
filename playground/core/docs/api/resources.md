# Ressources du playground

`Conversation` et `Message` sont des entités Doctrine exposées par API Platform, sans représentation dédiée à chaque écran.

- GET, GET collection, POST, PUT, PATCH et DELETE sont publics pour cette application de test. La collection Conversation est non paginée ; Message conserve la pagination API Platform.
- `Conversation.messages` contient des IRI de messages.
- `Message.conversation` contient une IRI de conversation.
- `title` est obligatoire et limité à 200 caractères ; `content` et la conversation du message sont obligatoires. `createdAt` et la liste de messages sont en lecture seule.
- Le frontend charge individuellement les relations nécessaires.

API Platform publie la représentation JSON-LD de la ressource après mutation. Une suppression produit une ressource minimale contenant son `@id`, que le bridge convertit en événement `delete`.

La synchronisation des relations est une responsabilité applicative : le backend du playground publie aussi la conversation concernée après mutation d'un message, et l'ancienne conversation si le message est déplacé. Le bridge ne déduit pas cette relation.

Après modification du contrat, exécuter `make bridge` depuis `playground/`.
