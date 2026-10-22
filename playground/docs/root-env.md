# Configuration locale

Le playground démarre avec `make init`, sans fichier `.env` à créer. Les valeurs de développement sont définies dans `compose.yaml`.

- `http://localhost:8000` : origine publique de l'application, de l'API et du hub.
- `http://localhost:4200` : accès direct au serveur Angular de développement.
- `http://core/.well-known/mercure` : URL interne utilisée par le publisher.
- `database:3306` : MariaDB entre conteneurs, sans port hôte requis.

Le frontend charge `assets/config.json`, généré au démarrage depuis l'environnement Compose. Aucune configuration OIDC ni session utilisateur n'est requise.

Les identifiants et les clés du hub sont des valeurs locales de démonstration. La stack Compose `meridiane-playground` conserve ses données dans des volumes dédiés. Elle n'est pas une configuration de déploiement.
