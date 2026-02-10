# Guide — créer et utiliser un bridge

Ce guide couvre le workflow complet : génération du bridge, intégration dans l’app Angular, puis usage au quotidien.

## Getting Started

1. Récupérer la spec OpenAPI (URL ou fichier JSON local)
2. Choisir un mode de génération
3. Générer le bridge
4. Intégrer la lib dans l’app Angular
5. Configurer `provideBridge()`

## Choisir un mode de génération

### Monorepo (sources locales)

```bash
npx meridiane generate @acme/backend-bridge --spec ./openapi.json --formats application/ld+json
```

Sortie par défaut : `projects/<libName>/` (modifiable via `--out`).

### Package npm (CI/CD)

```bash
npx -y @obsidiane/meridiane@latest build @acme/backend-bridge \
  --version 1.2.3 \
  --spec https://staging.example/api/docs.json \
  --formats application/ld+json
```

Sorties :
- `dist/<libName>/` (package prêt à publier)
- `dist/<libName>/*.tgz` (artefact `npm pack`)

### Boucle de dev (app Angular)

```bash
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json
```

Sorties :
- `dist/<libName>/` + `dist/<libName>/*.tgz`
- `node_modules/<packageName>/` (installation locale)

## Intégrer le bridge dans l’app

### Si vous avez un package npm

```bash
npm i @acme/backend-bridge
```

### Si vous êtes en monorepo

Ajoutez la lib générée (`projects/<libName>` ou `--out`) à votre workspace comme une lib Angular classique.
Meridiane ne modifie pas `angular.json` ni votre outil de build.

## Configurer `provideBridge()`

```ts
import {ApplicationConfig} from '@angular/core';
import {provideBridge} from '@acme/backend-bridge';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBridge({
      baseUrl: 'https://api.example.com',
      mercure: {hubUrl: 'https://api.example.com/.well-known/mercure'},
      // auth: {type: 'bearer', getToken: () => localStorage.getItem('token') ?? undefined},
    }),
  ],
};
```

## Utiliser les facades

### API orientée ressource (`FacadeFactory`)

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
this.books.getCollection$({page: 1, itemsPerPage: 20, filters: {title: 'Dune'}});
this.books.get$(book['@id']!);
this.books.post$({title: 'Neuromancer'});
this.books.patch$(book['@id']!, {title: 'Count Zero'});
this.books.delete$(book['@id']!);
```

Note : utilisez `FacadeFactory` pour instancier les `ResourceFacade`. Le factory gère le contexte d’injection requis par `toSignal()`.

### Appels ad-hoc (`BridgeFacade`)

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

## Models TypeScript

- `--no-models` désactive la génération.
- Les models générés sont exportés au même niveau que `provideBridge()`.

```ts
import type {Item} from '@acme/backend-bridge';
// import type {Book} from '@acme/backend-bridge';
```

## Realtime (Mercure/SSE)

Mercure est optionnel : sans `hubUrl`, le realtime est désactivé.

```ts
provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {hubUrl: 'https://api.example.com/.well-known/mercure'},
});
```

APIs utiles :
- `ResourceFacade<T>.watch$()` : écouter une (ou plusieurs) ressources
- `ResourceFacade<T>.watchSubResource$()` : écouter des sous-ressources via un champ relationnel
- `BridgeFacade.watchTypes$()` : écouter un topic “multi-entités” et obtenir un flux discriminé par type

## Docs

- CLI : `docs/cli.md`
- API : `docs/fonctionnalites/api.md`
- HTTP : `docs/fonctionnalites/http.md`
- Mercure/SSE : `docs/fonctionnalites/mercure-sse.md`
- FAQ : `docs/fonctionnalites/questions-frequentes.md`
