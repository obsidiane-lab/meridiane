# Sandbox Angular

Application Angular de démonstration pour valider le bridge généré par `@obsidiane/meridiane`.

## Objectif

La sandbox vérifie en conditions réelles :
- appels HTTP (Hydra + endpoints custom)
- auth JWT
- upload multipart
- realtime Mercure 1.0 (`watch$()` par ressource, `watch$(iri)` par entité, remplacement/suppression dans les stores)
- connexion SSE unique, reprise `last_event_id`, diagnostics

Les repositories enregistrent les ressources HTTP et Mercure dans des stores à signaux, sans transformer leurs relations en objets imbriqués. Le `ConversationService` compose la vue des messages et charge individuellement les IRI de `Conversation.messages` absentes du store. Les composants lisent les signaux ; les ressources déjà chargées sont réutilisées.

Le backend de l'application reste responsable des topics publiés et de la cohérence des relations : un événement Message ne reconstruit pas automatiquement `Conversation.messages`. Une conversation actualisée reçue par Mercure déclenche le chargement de ses nouvelles relations manquantes.

## Pré-requis

- backend disponible sur `http://localhost:8000`
- endpoints docs OpenAPI accessibles (`/api/docs.json`)

Démarrage backend (depuis la racine du repo) :

```bash
cd playground/api-platform
docker compose up -d --build
docker compose exec php php bin/console app:dev:reset --no-interaction
cd ../..
```

## Démarrage sandbox

Depuis la racine :

```bash
npm install
npm run sandbox:dev
```

Ce que fait `sandbox:dev` :
- lance `bridge:sync` (`node ../../packages/meridiane/cli.js dev`)
- génère/build le package `@obsidiane/bridge-sandbox`
- l'installe dans le `node_modules` du workspace
- lance `ng serve sandbox`

URL : `http://localhost:4200`

## Auth de dev

Comptes fixtures :
- `dev@meridiane.local` / `dev`
- `admin@meridiane.local` / `admin`

## Scripts utiles

Dans `playground/angular-app` :

- `npm run bridge:sync` : regénérer le bridge sandbox
- `npm run dev` : bridge sync + `ng serve sandbox`
- `npm run build` : bridge sync + build Angular
- `npm run test` : tests Angular
- `npm run lint` : lint

## Forcer une spec locale

```bash
npm -w @obsidiane/meridiane-sandbox run bridge:sync -- --spec ./openapi.json
```

## Pages principales

- `/login` : login JWT
- `/conversations` : CRUD + abonnement ciblé à la conversation sélectionnée et abonnement aux messages
- `/conversations/:id/messages` : GET conversation puis chargement des messages par leurs IRI
- `/http` : lab HTTP (echo, delay, flaky, upload)
- `/realtime` : écoute des ressources + diagnostics de la connexion Mercure
