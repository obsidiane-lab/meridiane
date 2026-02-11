# __PACKAGE_NAME__

Bridge Angular (runtime + models TypeScript) pour une API Platform (Hydra/JSON-LD), avec support Mercure/SSE optionnel.

Le package expose une API Angular volontairement minimaliste :
- `provideBridge()` pour configurer le bridge (HTTP + tokens + Mercure) ;
- `FacadeFactory` / `ResourceFacade<T>` pour une API orientée ressource ;
- `BridgeFacade` pour des appels ad-hoc.

## Installation

```bash
npm i __PACKAGE_NAME__
```

Le bridge est conçu pour être installé dans une application Angular. Les dépendances Angular et RxJS sont des `peerDependencies`.

## Compatibilité

- Angular `@angular/*` `^20.1.0`
- RxJS `^7.8.0`

## Démarrage rapide

Configurez le bridge au démarrage de l’application avec `provideBridge()` (requis).

### Application standalone (recommandé)

```ts
// app.config.ts (ou main.ts)
import {ApplicationConfig} from '@angular/core';
import {provideBridge} from '__PACKAGE_NAME__';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBridge({
      baseUrl: 'https://api.example.com',
      mercure: {hubUrl: 'https://api.example.com/.well-known/mercure'},
    }),
  ],
};
```

### Application NgModule

```ts
import {NgModule} from '@angular/core';
import {provideBridge} from '__PACKAGE_NAME__';

@NgModule({
  providers: [
    provideBridge({baseUrl: 'https://api.example.com'}),
  ],
})
export class AppModule {}
```

## Configuration

`provideBridge({ ... })` accepte notamment :
- `baseUrl` (requis) ;
- `auth` (Bearer ou interceptor custom) ;
- `mercure` (hubUrl + `topicMode` + stratégie de connexions SSE `connectionMode`/`maxUrlLength`) ;
- `defaults` (headers/timeout/retries) ;
- `singleFlight` (déduplication “in-flight” des requêtes HTTP identiques `GET/HEAD/OPTIONS`) ;
- `debug` (logs runtime) ;
- `extraInterceptors` (interceptors Angular additionnels).

### Cookies / `withCredentials`

Le bridge peut envoyer des cookies (sessions) côté HTTP et SSE.

Le comportement `withCredentials` par défaut est déduit de `mercure.init` :
- `credentials: 'include'` (défaut) → cookies envoyés
- `credentials: 'omit'` → cookies non envoyés

Vous pouvez aussi surcharger au cas par cas via `opts.withCredentials` sur les appels HTTP.

```ts
import {provideBridge} from '__PACKAGE_NAME__';

provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {
    hubUrl: 'https://api.example.com/.well-known/mercure',
    init: {credentials: 'omit'},
  },
});
```

### Auth (Bearer)

`auth` accepte :
- une string (token Bearer),
- `{ type: 'bearer', token }`,
- `{ type: 'bearer', getToken }` (sync ou async),
- ou un `HttpInterceptorFn` custom.

```ts
import {provideBridge} from '__PACKAGE_NAME__';

provideBridge({
  baseUrl: 'https://api.example.com',
  auth: {type: 'bearer', getToken: () => localStorage.getItem('token') ?? undefined},
});
```

### Defaults (headers / timeout / retries)

```ts
import {provideBridge} from '__PACKAGE_NAME__';

provideBridge({
  baseUrl: 'https://api.example.com',
  defaults: {
    headers: {'X-Requested-With': 'fetch'},
    timeoutMs: 15_000,
    retries: {count: 2, delayMs: 250, methods: ['GET']},
  },
});
```

### Debug

```ts
import {provideBridge} from '__PACKAGE_NAME__';

provideBridge({baseUrl: 'https://api.example.com', debug: true});
```

## Appeler l’API

### Style orienté ressource (`FacadeFactory` + `ResourceFacade<T>`)

```ts
import {inject} from '@angular/core';
import {FacadeFactory, ResourceFacade, Item} from '__PACKAGE_NAME__';

type Book = Item & {title?: string};

export class BooksService {
  private readonly factory = inject(FacadeFactory);
  readonly books: ResourceFacade<Book> = this.factory.create<Book>({url: '/api/books'});
}
```

Exemples :

```ts
// collection Hydra
this.books.getCollection$({page: 1, itemsPerPage: 20, filters: {title: 'Dune'}});

// item (souvent via @id)
this.books.get$(book['@id']!);

// write
this.books.post$({title: 'Neuromancer'});
this.books.patch$(book['@id']!, {title: 'Count Zero'});
this.books.delete$(book['@id']!);
```

### Style ad-hoc (`BridgeFacade`)

```ts
import {inject} from '@angular/core';
import {BridgeFacade} from '__PACKAGE_NAME__';

export class HealthService {
  private readonly bridge = inject(BridgeFacade);
  getHealth$() {
    return this.bridge.get$<{status: string}>('/health');
  }
}
```

## Realtime (Mercure/SSE)

Le realtime est inactif tant que `mercure.hubUrl` n’est pas fourni à `provideBridge()`.

```ts
provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {hubUrl: 'https://api.example.com/.well-known/mercure', topicMode: 'url'},
});
```

### Concurrence

Le bridge propose 2 stratégies SSE configurables via `provideBridge({mercure: ...})` :
- `connectionMode: 'single'` : chaque appel `watch*` ouvre sa propre connexion SSE ;
- `connectionMode: 'auto'` (défaut) : les topics sont mutualisés, puis découpés automatiquement en plusieurs connexions si l’URL Mercure dépasse `maxUrlLength` (défaut `1900`).

Vous pouvez forcer une connexion dédiée par appel avec `newConnection: true` sur `watch$`, `watchSubResource$` et `watchTypes$`.

```ts
provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {
    hubUrl: 'https://api.example.com/.well-known/mercure',
    connectionMode: 'auto',
    maxUrlLength: 1900,
  },
});
```

Côté HTTP, le bridge déduplique les requêtes identiques tant qu’elles sont en cours (single-flight, activé par défaut) :
- `GET` / `HEAD` / `OPTIONS` : deux appels identiques partagent le même appel réseau et reçoivent la même réponse ;
- les méthodes avec body (`POST`/`PUT`/`PATCH`/`DELETE`) ne sont pas dédupliquées.

Ce n’est pas un cache : une fois la requête terminée, un nouvel appel identique relance un nouvel appel réseau.

Pour désactiver :

```ts
provideBridge({baseUrl: 'https://api.example.com', singleFlight: false});
```

API :
- `ResourceFacade<T>.watch$(iri | iri[], {newConnection?})` / `unwatch(iri | iri[])`
- `ResourceFacade<T>.watchSubResource$(iri | iri[], 'field.path', {newConnection?})`
- `BridgeFacade.watch$(iri | iri[], filter?, {newConnection?})` / `unwatch(iri | iri[])`
- `BridgeFacade.watchTypes$(iri | iri[], resourceTypes, cfg?, {newConnection?})` (topics “multi-entités”)
- `BridgeFacade.realtimeDiagnostics$()` (état courant des connexions SSE actives)

Note SSR : la connexion SSE ne s’ouvre que dans le navigateur.

### Topic “multi-entités” (event-bus)

Quand un même topic Mercure publie plusieurs types de payloads (sans lien entre eux),
utilisez `BridgeFacade.watchTypes$()`.
Le flux renvoie une union discriminée par `resourceType` (par défaut via `@type` en JSON-LD).

Fonctionnement (résumé) :
- le bridge s’abonne au(x) topic(s) Mercure (connexion dédiée ou mutualisée selon `connectionMode`)
- chaque event JSON recu est testé sur le champ de discrimination (`@type` par défaut)
- seuls les `resourceType` explicitement demandés sont émis
- chaque event émis est `{ resourceType, payload }`

Configuration :
- `discriminator` : champ type (défaut `@type`)
- `resourceTypes` : liste de strings à accepter (`['Conversation', 'Message']`, etc.)

```ts
import {inject} from '@angular/core';
import {BridgeFacade} from '__PACKAGE_NAME__';
import type {Item} from '__PACKAGE_NAME__';

type Conversation = Item & {title?: string | null};
type Message = Item & {originalText?: string | null};

type Registry = {
  Conversation: Conversation;
  Message: Message;
};

const bridge = inject(BridgeFacade);

bridge.watchTypes$<Registry>(
  '/api/events/me',
  ['Conversation', 'Message'],
  {discriminator: '@type'}
).subscribe((evt) => {
  switch (evt.resourceType) {
    case 'Conversation':
      // evt.payload: Conversation
      break;
    case 'Message':
      // evt.payload: Message
      break;
  }
});
```

## Models TypeScript

Les models générés (si présents) sont exportés au même niveau que le runtime :

```ts
import type {Item} from '__PACKAGE_NAME__';
// import type {Book} from '__PACKAGE_NAME__';
```

En JSON-LD (`application/ld+json`), l’IRI est typiquement dans `model['@id']`.
