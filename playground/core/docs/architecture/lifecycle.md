# Dates des ressources de test

Conversation et Message exposent leur date de création `createdAt`. Cette valeur reste dans la ressource native et peut être formatée par le frontend pour l'affichage.

Les suppressions sont physiques. L'événement Mercure de suppression sert à retirer la ressource du store ; il ne constitue pas un journal d'audit.

Le schéma local est préparé avec `make init`, sans reprise des migrations Foundation.
