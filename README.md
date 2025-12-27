# Meridiane

Un CLI pour générer un bridge Angular depuis une spec OpenAPI (API Platform + Mercure).
Le bridge embarque un runtime HTTP/SSE et, si besoin, des models TypeScript.

![CI](https://github.com/obsidiane-lab/meridiane/actions/workflows/ci.yml/badge.svg)

## Getting Started

1. Installer le CLI : `npm i -D @obsidiane/meridiane`
2. Générer le bridge (choisir un mode) :

```bash
# Monorepo (sources locales)
npx meridiane generate @acme/backend-bridge --spec ./openapi.json

# Dév app Angular
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json

# CI/CD (package npm)
npx meridiane build @acme/backend-bridge --version 0.1.0 --spec https://staging.example/api/docs.json
```

3. Configurer l’app Angular :

```ts
import {provideBridge} from '@acme/backend-bridge';

provideBridge({baseUrl: 'https://api.example.com'});
```

## Features

- Génération contract-driven (models basés sur les endpoints exposés)
- Runtime Angular complet (interceptors, auth, retries, facades)
- Mercure/SSE mono-connexion avec gestion des topics
- Single-flight HTTP pour déduplication in-flight
- Mode monorepo ou package npm publiable
- Build standalone (pas besoin d’un workspace Angular pour packager)

## Docs

1. [Guide principal](docs/guide-bridge.md)
2. [CLI](docs/cli.md)
3. [API publique](docs/fonctionnalites/api.md)
4. [HTTP / Hydra](docs/fonctionnalites/http.md)
5. [Mercure / SSE](docs/fonctionnalites/mercure-sse.md)
6. [FAQ](docs/fonctionnalites/questions-frequentes.md)
