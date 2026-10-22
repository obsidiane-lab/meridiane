# Stack du playground

- Backend : PHP 8.4+, Symfony, API Platform, Doctrine et Symfony Mercure Bundle.
- Frontend : Angular 22, TypeScript, RxJS, Spartan UI et Tailwind CSS 4.
- Temps réel : hub Mercure 1.0 et bridge Meridiane généré depuis les sources locales du dépôt.
- Développement : Node 24, Docker Compose, FrankenPHP/Caddy et MariaDB.

Les versions résolues font référence dans `core/composer.lock` et `webfront/package-lock.json`. Les images et ports font référence dans `Dockerfile` et `compose.yaml`.

Contrôles : `make bridge`, `make lint`, `make build`, `make phpstan`, puis les parcours manuels du [README](../../README.md).
