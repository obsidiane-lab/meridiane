# Tests transverses

Les contrôles automatisés actuels vivent dans `packages/meridiane/test` :

- fixture OpenAPI entity first et cohérence des modèles entre les modes ;
- routage des événements Mercure, suppressions et cycle de vie de la connexion SSE ;
- en CI, génération puis compilation du bridge et des modèles depuis cette fixture.

Lancer `npm -w packages/meridiane test` depuis la racine. Les tests end-to-end avec
un hub et un navigateur réels restent à ajouter ; le playground sert à leur
validation manuelle.
