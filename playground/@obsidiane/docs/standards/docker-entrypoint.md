# Entrypoints du playground

`@obsidiane/frankenphp/docker-entrypoint.sh` prépare le backend avant FrankenPHP : installation Composer si nécessaire, attente de MariaDB et démarrage de l'application. Les migrations Foundation ont été retirées ; le schéma local Conversation/Message est préparé explicitement par `make init`.

`@obsidiane/webfront/docker-entrypoint.sh` prépare les dépendances Angular et sa configuration runtime, puis démarre le serveur de développement. `runtime-config.sh` écrit `src/assets/config.json` à partir de l'environnement Compose.

Pour consulter la configuration servie :

```bash
docker compose exec webfront cat /app/src/assets/config.json
```

La stack de développement est décrite dans [le README](../../../README.md). Aucune configuration de déploiement n'est fournie pour cette application locale anonyme.
