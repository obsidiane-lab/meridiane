# Architecture backend

Symfony/API Platform expose Conversation et Message en JSON-LD, avec Doctrine pour la persistance et Mercure pour les mises à jour.

Le contrat suit les entités. Les relations restent en IRI et sont chargées à la demande par le frontend. Les groupes de sérialisation par écran et les providers/processors sans besoin concret sont évités.

La publication de la conversation après changement de ses messages est une règle du backend playground. Le bridge ne porte pas cette logique.

Les données sont publiques pour les tests locaux : aucun parcours de connexion, utilisateur ou Project n'est requis. Le runtime est décrit dans [le README](../../../README.md).
