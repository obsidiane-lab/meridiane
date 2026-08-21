# Sources internes du générateur

- `application/` orchestre les workflows du CLI ;
- `domain/` contient les règles et la normalisation des options ;
- `infrastructure/` gère fichiers, processus, specs, workspaces et installation locale ;
- `generators/bridge/` écrit les fichiers du runtime Angular ;
- `generators/models/` transforme OpenAPI et écrit les modèles TypeScript.

Le runtime Angular généré se trouve dans `../templates/angular-bridge/`.
