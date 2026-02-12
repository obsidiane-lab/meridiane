# Backend Symfony (API Platform + Mercure)

Backend de développement utilisé par Meridiane pour générer la spec OpenAPI et tester le runtime Angular.

## Stack

- Symfony 7.4
- API Platform 4.2
- Mercure (hub intégré via FrankenPHP)
- MariaDB (Docker)
- Auth JWT (`/api/auth/login`)

## Démarrage local

Depuis la racine du repo :

```bash
cd apps/backend
docker compose up -d --build
```

Après le premier démarrage, initialiser la base et les fixtures dev :

```bash
docker compose exec php php bin/console app:dev:reset --no-interaction
```

Arrêt :

```bash
docker compose down
```

## URLs utiles

- API : `http://localhost:8000/api`
- docs UI : `http://localhost:8000/api/docs`
- docs JSON : `http://localhost:8000/api/docs.json`
- hub Mercure : `http://localhost:8000/.well-known/mercure`

## Comptes de développement

Fixtures (`app:dev:reset`) :
- `dev@meridiane.local` / `dev`
- `admin@meridiane.local` / `admin`

## Endpoints spécifiques au repo

- `POST /api/auth/login` : login JWT
- `GET /api/auth/me` : utilisateur courant
- `GET|POST|PUT|PATCH|DELETE /test/echo` : endpoint echo
- `GET /test/delay?ms=...` : latence simulée
- `GET /test/flaky?key=...&fails=...` : erreurs temporaires simulées
- `POST /test/mercure/publish` : publication manuelle Mercure (dev)
- `POST /api/file_assets/upload` : upload multipart

## Données exposées par l'API

Ressources principales :
- `Conversation`
- `Message`
- `User`
- `FileAsset`
- `KeyValueConfig`
- `EventLog`

Toutes sont disponibles via API Platform avec OpenAPI/Hydra et support Mercure (suivant la configuration de chaque entité).

## Notes

- migrations auto-appliquées au démarrage du conteneur `php`
- CORS autorise les origines localhost/127.0.0.1
- la doc `apps/backend/docs/` provient majoritairement du template Symfony Docker (référence infra)
