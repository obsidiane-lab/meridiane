# Guide — créer et utiliser un bridge

Workflow complet : génération du bridge, intégration Angular, usage HTTP/SSE au quotidien.

## Vue d'ensemble

1. récupérer une spec OpenAPI
2. choisir un mode (`generate`, `dev`, `build`)
3. générer le bridge
4. intégrer le package dans l'app Angular
5. configurer `provideBridge()`

## Choisir un mode

### `generate` (sources locales, monorepo)

```bash
npx meridiane generate @acme/backend-bridge --spec ./openapi.json
```

Sortie : `projects/<libName>/` (ou `--out <dir>`).

### `dev` (boucle locale)

```bash
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json
```

Sorties :
- `dist/<libName>/` + `.tgz`
- `node_modules/<packageName>/` (installation locale)

### `build` (CI/CD)

```bash
npx meridiane build @acme/backend-bridge --version 1.2.3 --spec https://staging.example/api/docs.json
```

Sorties :
- `dist/<libName>/`
- `dist/<libName>/*.tgz`

## Intégrer le bridge dans l'app

### Package npm

```bash
npm i @acme/backend-bridge
```

### Génération locale

Ajoutez la lib générée (`projects/<libName>` ou `--out`) à votre workspace Angular.
Meridiane ne patch pas `angular.json`.

## Configurer `provideBridge()`

```ts
import {ApplicationConfig} from '@angular/core';
import {provideBridge} from '@acme/backend-bridge';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBridge({
      baseUrl: 'https://api.example.com',
      auth: {type: 'bearer', getToken: () => localStorage.getItem('token') ?? undefined},
      mercure: {
        hubUrl: 'https://api.example.com/.well-known/mercure',
        topicMode: 'url',
        connectionMode: 'auto',
        maxUrlLength: 1900,
        init: {credentials: 'include'},
      },
      defaults: {
        timeoutMs: 15_000,
        retries: {count: 2, delayMs: 250, methods: ['GET']},
      },
      singleFlight: true,
      debug: false,
    }),
  ],
};
```

## Appels API

### Style ressource : `FacadeFactory` + `ResourceFacade<T>`

```ts
import {inject} from '@angular/core';
import {FacadeFactory, Item} from '@acme/backend-bridge';

type Book = Item & {title?: string};

export class BooksService {
  private readonly factory = inject(FacadeFactory);
  readonly books = this.factory.create<Book>({url: '/api/books'});
}
```

Exemples :

```ts
this.books.getCollection$({page: 1, itemsPerPage: 20});
this.books.get$(book['@id']!);
this.books.post$({title: 'Neuromancer'});
this.books.patch$(book['@id']!, {title: 'Count Zero'});
this.books.delete$(book['@id']!);
```

### Style ad-hoc : `BridgeFacade`

```ts
import {inject} from '@angular/core';
import {BridgeFacade} from '@acme/backend-bridge';

export class HealthService {
  private readonly bridge = inject(BridgeFacade);
  getHealth$() {
    return this.bridge.get$<{status: string}>('/health');
  }
}
```

## Realtime (Mercure/SSE)

Mercure est optionnel. Sans `mercure.hubUrl`, aucune connexion SSE n'est ouverte.

API principale :
- `ResourceFacade.watch$(iri|iri[], {newConnection?})`
- `ResourceFacade.watchSubResource$(iri|iri[], field, {newConnection?})`
- `BridgeFacade.watch$(iri|iri[], filter?, {newConnection?})`
- `BridgeFacade.watchTypes$(iri|iri[], resourceTypes, cfg?, {newConnection?})`
- `BridgeFacade.realtimeDiagnostics$()`

### Modes de connexion SSE

- `connectionMode: 'auto'` (défaut) : connexions mutualisées + découpage automatique si URL Mercure trop longue (`maxUrlLength`)
- `connectionMode: 'single'` : connexion dédiée par abonnement
- `newConnection: true` : forcer une connexion dédiée pour un abonnement précis

### Cas `watchTypes$`

`watchTypes$()` filtre par discriminant de payload (`@type` par défaut), pas par provenance réseau stricte du topic.

Pour isoler strictement un topic :
- `newConnection: true` sur l'appel, ou
- `connectionMode: 'single'` global.

### SSR

Le bridge n'ouvre pas d'`EventSource` côté serveur.

## Models TypeScript

- actifs par défaut
- désactivables avec `--no-models`
- exportés au même niveau que le runtime

```ts
import type {Item} from '@acme/backend-bridge';
// import type {BookBookRead} from '@acme/backend-bridge';
```

## Suite de docs

- CLI : `docs/cli.md`
- API publique : `docs/fonctionnalites/api.md`
- HTTP / Hydra : `docs/fonctionnalites/http.md`
- Mercure / SSE : `docs/fonctionnalites/mercure-sse.md`
- FAQ : `docs/fonctionnalites/questions-frequentes.md`
