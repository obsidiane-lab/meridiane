# Tests transverses

Ce dossier accueillera les tests qui valident le générateur comme un produit complet et qui ne dépendent pas d'une application particulière :

- fixtures OpenAPI déterministes ;
- tests d'intégration `spec → génération → compilation` ;
- tests end-to-end du playground.

Les tests unitaires propres à un package restent au plus près de son code. Le playground sert à l'exploration et à la validation manuelle ; il ne remplace pas ces tests automatisés.
