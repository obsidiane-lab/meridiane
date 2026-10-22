# Contrat API

Le format du playground est JSON-LD. Les relations sont des IRI et les ressources ne sont pas enrichies de graphes propres aux écrans.

Le contrat OpenAPI est exposé sous `/api/docs.json`, la documentation sous `/api/docs`. Les modèles Angular sont générés avec `make bridge` depuis ce contrat.

Le repository conserve la ressource complète reçue en HTTP ou dans un événement Mercure `upsert`. Une suppression est traitée par son IRI (`delete`) ; elle ne doit pas devenir une ressource incomplète dans le store.

Les erreurs conservent leur code HTTP et les contraintes API Platform. Les messages techniques du backend ne sont pas des libellés d'interface.
