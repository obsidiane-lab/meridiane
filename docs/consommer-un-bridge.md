# Consommer un bridge (package npm généré)

Cette page s’adresse au **consommateur** d’un package bridge généré par Meridiane (ex: `@acme/backend-bridge`).

Un bridge contient :
- un runtime Angular (HTTP + facades) ;
- des models TypeScript (optionnel) ;
- un `README.md` embarqué dans le package (pratique pour les usages au quotidien).

## Installer le package

```bash
npm i @acme/backend-bridge
```

Le bridge déclare `@angular/*` et `rxjs` en `peerDependencies` : il doit être utilisé dans une app Angular compatible.

## Configurer le bridge

Le point d’entrée est `provideBridge()`. Il configure `HttpClient` (fetch + interceptors) et fournit les tokens internes (base URL, defaults, Mercure, logger).

### Cookies / `withCredentials`

Le bridge peut envoyer des cookies (sessions) côté HTTP et SSE.

Le `withCredentials` par défaut est déduit de `mercure.init` :
- `credentials: 'include'` (défaut) → cookies envoyés
- `credentials: 'omit'` → cookies non envoyés

```ts
import {provideBridge} from '@acme/backend-bridge';

provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {
    hubUrl: 'https://api.example.com/.well-known/mercure',
    init: {credentials: 'include'},
  },
});
```

La plupart des méthodes HTTP du bridge acceptent aussi `opts.withCredentials` pour surcharger ponctuellement.

### Application standalone (recommandé)

```ts
import {ApplicationConfig} from '@angular/core';
import {provideBridge} from '@acme/backend-bridge';

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
import {provideBridge} from '@acme/backend-bridge';

@NgModule({
  providers: [provideBridge({baseUrl: 'https://api.example.com'})],
})
export class AppModule {}
```

### Auth (Bearer)

`auth` accepte une string, un objet Bearer (token ou `getToken()`), ou un `HttpInterceptorFn` custom.

```ts
import {provideBridge} from '@acme/backend-bridge';

provideBridge({
  baseUrl: 'https://api.example.com',
  auth: {type: 'bearer', getToken: () => localStorage.getItem('token') ?? undefined},
});
```

### Defaults (headers / timeout / retries)

```ts
import {provideBridge} from '@acme/backend-bridge';

provideBridge({
  baseUrl: 'https://api.example.com',
  defaults: {
    headers: {'X-Requested-With': 'fetch'},
    timeoutMs: 15_000,
    retries: {count: 2, delayMs: 250, methods: ['GET']},
  },
});
```

Notes :
- si `Accept` est absent, le bridge ajoute `application/ld+json` ;
- pour `PATCH`, le `Content-Type` par défaut est `application/merge-patch+json`.

## Appeler l’API

Le bridge propose deux styles, selon votre usage.

### API orientée ressource (`FacadeFactory` + `ResourceFacade<T>`)

```ts
import {inject} from '@angular/core';
import {FacadeFactory, ResourceFacade, Item} from '@acme/backend-bridge';

type Book = Item & {title?: string};

export class BooksService {
  private readonly factory = inject(FacadeFactory);
  readonly books: ResourceFacade<Book> = this.factory.create<Book>({url: '/api/books'});
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

## Realtime (Mercure/SSE)

Le realtime est inactif tant que `mercure.hubUrl` n’est pas fourni à `provideBridge()`.

`topicMode` aligne la valeur envoyée au hub dans `?topic=` :
- `url` (défaut) : topic absolu (`https://api.example.com/api/...`)
- `iri` : topic relatif (`/api/...`)

### Concurrence

Le bridge maintient **une seule connexion SSE** (une seule requête/connexion `EventSource`) et gère les topics en ref-count :
- si plusieurs parties de l’app “watch” la même ressource, le topic est partagé (pas de doublon de connexion) ;
- vous ne pouvez pas avoir plusieurs connexions SSE concurrentes “pour la même chose” : c’est volontairement mutualisé.

À côté HTTP, le runtime déduplique les requêtes identiques **tant qu’elles sont en cours** (single-flight, activé par défaut) :
- `GET` / `HEAD` / `OPTIONS` : deux appels identiques partagent le même appel réseau et reçoivent la même réponse ;
- les méthodes avec body (`POST`/`PUT`/`PATCH`/`DELETE`) ne sont pas dédupliquées.

Ce mécanisme n’est pas un cache : une fois la requête terminée, un nouvel appel identique relance un nouvel appel réseau.

Vous pouvez le désactiver si nécessaire :

```ts
provideBridge({baseUrl: 'https://api.example.com', singleFlight: false});
```

API :
- `ResourceFacade<T>.watch$(iri | iri[])` / `unwatch(iri | iri[])`
- `ResourceFacade<T>.watchSubResource$(iri | iri[], 'field.path')`
- `BridgeFacade.watch$(iri | iri[])` / `unwatch(iri | iri[])`

## Models TypeScript

Les models générés sont exportés au même niveau que `provideBridge()` :

```ts
import type {Item} from '@acme/backend-bridge';
// import type {Book} from '@acme/backend-bridge';
```

En JSON-LD (`application/ld+json`), l’IRI se trouve typiquement dans `model['@id']`.

## Aller plus loin

- API publique du bridge : `docs/fonctionnalites/api-publique.md`
- HTTP / Hydra : `docs/fonctionnalites/fonctionnalites-http.md`
- Mercure / SSE : `docs/fonctionnalites/fonctionnalites-mercure-sse.md`
