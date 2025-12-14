# Créer un bridge (workflow recommandé)

Objectif : à chaque release du backend, générer un **package npm bridge** (sans repo dédié), puis le publier pour qu’il soit consommé par une ou plusieurs apps Angular.

## Prérequis

- Node.js ≥ 18
- Une spec OpenAPI du backend :
  - URL : `http(s)://…` (ex: `https://staging.example/api/docs.json`)
  - ou fichier JSON local (ex: `./openapi.json`)

## 1) Générer le package

Dans la pipeline du backend (ou n’importe quel dossier de travail) :

```bash
npx -y @obsidiane/meridiane@0.1.0 build @acme/backend-bridge \
  --version 1.2.3 \
  --spec https://staging.example/api/docs.json \
  --formats application/ld+json
```

Artefacts : `dist/backend-bridge` + `.tgz` (via `npm pack`) dans `dist/backend-bridge`.

Notes :
- `--formats` est “contract-driven” : seuls les modèles réellement utilisés par les endpoints (pour ces formats) sont générés.
- `--formats` est multi-format : l’ordre est significatif (format primaire en premier), ex :
  - `--formats application/ld+json,application/json`
  - `--formats application/json,application/ld+json`
- `PATCH` utilise `Partial<...>` : pas de modèles `*.jsonMergePatch`.
- Meridiane ne publie pas : la CI garde le contrôle de `npm publish`.

## 2) Publier le package généré

```bash
npm publish dist/backend-bridge
```

## 3) Consommer le bridge dans une app Angular

Installation :

```bash
npm i @acme/backend-bridge@1.2.3
```

Configuration (Angular standalone) :

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideBridge } from '@acme/backend-bridge';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideBridge({
      baseUrl: 'https://api.example.com',
      debug: false,
      // auth: { type: 'bearer', getToken: () => localStorage.getItem('token') ?? undefined },
      // mercure: { hubUrl: 'https://mercure.example/.well-known/mercure' },
    }),
  ],
});
```

## 4) Utiliser les models et facades

Models (générés depuis OpenAPI) :

```ts
import type { Conversation } from '@acme/backend-bridge';
```

Accès HTTP “ressource” (recommandé) :

```ts
import { inject } from '@angular/core';
import { FacadeFactory } from '@acme/backend-bridge';
import type { Conversation } from '@acme/backend-bridge';

const factory = inject(FacadeFactory);
const conversations = factory.create<Conversation>({ url: '/api/conversations' });
```

Accès HTTP “ad-hoc” :

```ts
import { inject } from '@angular/core';
import { BridgeFacade } from '@acme/backend-bridge';

const bridge = inject(BridgeFacade);
bridge.get$('/api/auth/me').subscribe();
```

Référence : `docs/fonctionnalites/api-publique.md`.
