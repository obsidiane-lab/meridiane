# Guide — créer et utiliser un bridge

Workflow Meridiane 3.0 : génération du bridge, intégration Angular, usage HTTP/Mercure 1.0 au quotidien.

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

Pour une même spec et les mêmes options, les trois modes produisent les mêmes modèles :
propriétés requises et nullabilité suivent OpenAPI, en développement comme en production.

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
      http: {withCredentials: true},
      auth: {type: 'bearer', getToken: () => localStorage.getItem('token') ?? undefined},
      mercure: {
        hubUrl: 'https://api.example.com/.well-known/mercure',
        authorize: '/api/mercure/authorization',
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

`http.withCredentials` vaut `false` par défaut pour les appels cross-origin.
Mercure configure ses credentials indépendamment (`mercure.withCredentials`, `true`
par défaut) pour transmettre le cookie d'abonné au hub.

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

Mercure est optionnel. Sans `mercure.hubUrl`, aucune connexion SSE n'est ouverte. Le hub doit implémenter Mercure 1.0.

`watch$()` écoute tous les items de la ressource via `match_urlpattern`. `watch$(iri)`
écoute un item précis via `match`, avec une IRI relative ou absolue. Les deux émettent
directement les ressources JSON reçues (`T | ResourceDeletion`) que le repository
applique au store. `isResourceDeletion()` reconnaît le payload de suppression
d'API Platform : `@id`, éventuellement accompagné de `@type`.

```ts
import {isResourceDeletion} from '@acme/backend-bridge';

const books = factory.create<Book>({url: '/api/books'});

const allBooks = books.watch$().subscribe((resource) =>
  isResourceDeletion(resource) ? store.remove(resource['@id']) : store.upsert(resource)
);

const oneBook = books.watch$('/api/books/42').subscribe((resource) =>
  isResourceDeletion(resource) ? store.remove(resource['@id']) : store.upsert(resource)
);
// Quand l'écoute n'est plus nécessaire :
allBooks.unsubscribe();
oneBook.unsubscribe();
```

- connexions SSE partagées par tous les `watch$()`, découpées automatiquement au-delà de `mercure.maxUrlLength` (4000 par défaut) ou de 100 abonnements
- chaque abonnement dure tant que son Observable est souscrit
- authentification par le cookie HttpOnly `__Secure-mercure_access_token` posé par le backend ; `mercure.authorize` le fait obtenir et renouveler par le bridge
- état : `ResourceFacade.connectionStatus`, `BridgeFacade.realtimeStatus$()`, `BridgeFacade.realtimeDiagnostics$()`
- SSR : aucune connexion `EventSource` côté serveur

Détails, limites de reprise et migration de Meridiane 2.x vers 3.0 : `docs/fonctionnalites/mercure-sse.md`.

## Ressources natives et stores à signaux

Meridiane fournit le transport et les types ; les stores, repositories, services et
composants appartiennent à l'application. Configurez API Platform pour que GET et
Mercure exposent la même représentation complète de chaque ressource. Le bridge
transmet le JSON reçu sans résoudre les relations et sans GET supplémentaire.

Le repository alimente le même store depuis HTTP et Mercure. Exemple avec un
`BookStore` de l'application exposant `entities()`, `upsert()` et `remove()` :

```ts
import {inject, Injectable} from '@angular/core';
import {tap} from 'rxjs';
import {Book, FacadeFactory, IriRequired, isResourceDeletion} from '@acme/backend-bridge';
import {BookStore} from './book.store';

@Injectable({providedIn: 'root'})
export class BookRepository {
  private readonly store = inject(BookStore);
  private readonly api = inject(FacadeFactory).create<Book>({url: '/api/books'});
  readonly books = this.store.entities(); // Signal<readonly Book[]>

  fetch$(iri: IriRequired) {
    return this.api.get$(iri).pipe(tap((book) => this.store.upsert(book)));
  }

  watch$(iri?: IriRequired) {
    return this.api.watch$(iri).pipe(tap((resource) => {
      if (isResourceDeletion(resource)) this.store.remove(resource['@id']);
      else this.store.upsert(resource);
    }));
  }
}
```

Le code qui déclenche le chargement ou l'écoute souscrit à ces Observables, gère les
erreurs et libère ses abonnements (`takeUntilDestroyed()` ou `unsubscribe()`). Un service
peut exposer ces signaux et ajouter ses agrégations. Le composant les lit directement :

```ts
readonly books = inject(BookRepository).books;
```

```html
@for (book of books(); track book['@id']) {
  <p>{{ book.title }}</p>
}
```

Si `Conversation.messages` contient des IRI, le store conserve ces IRI. Pour afficher
les messages, l'application charge chaque ressource manquante via son repository,
puis compose la vue depuis les signaux des stores. Elle réutilise les ressources déjà
chargées. Le développeur configure également les publications et topics qui doivent
actualiser une conversation lorsqu'un message change ; le bridge ne déduit pas cette
logique métier.

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
