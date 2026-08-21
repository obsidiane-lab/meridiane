# Playground Meridiane

Le playground est l'environnement interne utilisé pour développer et valider `@obsidiane/meridiane` en conditions réelles.

Il ne fait pas partie du package publié :

- `api-platform/` fournit une API Symfony, sa spec OpenAPI et un hub Mercure ;
- `angular-app/` génère puis consomme `@obsidiane/bridge-sandbox` ;
- les commandes historiques `npm run sandbox:*` restent les points d'entrée depuis la racine.

## Démarrage

Depuis la racine du dépôt, démarrer l'API :

```bash
cd playground/api-platform
docker compose up -d --build
docker compose exec php php bin/console app:dev:reset --no-interaction
cd ../..
```

Puis démarrer l'application Angular et générer son bridge :

```bash
npm run sandbox:dev
```

URLs locales :

- API : `http://localhost:8000`
- documentation OpenAPI : `http://localhost:8000/api/docs`
- application Angular : `http://localhost:4200`

## Commandes conservées

- `npm run sandbox:bridge` : génération et installation locale du bridge ;
- `npm run sandbox:build` : génération du bridge puis build Angular ;
- `npm run sandbox:dev` : génération du bridge puis serveur Angular.

Les mêmes actions sont également disponibles sous les noms plus explicites `playground:bridge`, `playground:build` et `playground:dev`.

Le nom `sandbox` est conservé dans les scripts et dans le package interne pour ne pas modifier les habitudes ni les commandes existantes.
