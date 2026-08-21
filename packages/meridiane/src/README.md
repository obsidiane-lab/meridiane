# Sources internes du générateur

- `application/` orchestre les workflows du CLI ;
- `domain/` contient les règles et la normalisation des options ;
- `infrastructure/` gère fichiers, processus, specs et workspaces ;
- `generators/` transforme les contrats OpenAPI ;
- `build.js`, `dev.js` et `generate.js` sont les points d'entrée internes utilisés par `cli.js`.

Le runtime Angular généré se trouve dans `../templates/angular-bridge/`.
