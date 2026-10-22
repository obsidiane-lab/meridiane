# @app/bridge

Bridge Angular (runtime + models TypeScript) pour une API Platform (Hydra/JSON-LD), avec support Mercure/SSE optionnel.

Généré avec Meridiane 3.0 pour Mercure 1.0. Le bridge conserve la représentation
des ressources et leurs relations par IRI. Les stores à signaux, repositories,
services métier et composants restent dans l'application consommatrice.

Le package expose une API Angular volontairement minimaliste :
- `provideBridge()` pour configurer le bridge (HTTP + tokens + Mercure) ;
- `FacadeFactory` / `ResourceFacade<T>` pour une API orientée ressource ;
- `BridgeFacade` pour des appels ad-hoc.

## Installation

```bash
npm i @app/bridge
```

Le bridge est conçu pour être installé dans une application Angular. Les dépendances Angular et RxJS sont des `peerDependencies`.

## Compatibilité

- Angular `@angular/*` `^20.0.0 || ^21.0.0`
- RxJS `^7.8.0`

## Démarrage rapide

Configurez le bridge au démarrage de l’application avec `provideBridge()` (requis).

### Application standalone (recommandé)

```ts
// app.config.ts (ou main.ts)
import {ApplicationConfig} from '@angular/core';
import {provideBridge} from '@app/bridge';

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
import {provideBridge} from '@app/bridge';

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
- `http` (`withCredentials` HTTP par défaut) ;
- `mercure` (`hubUrl` d'un hub Mercure 1.0, `withCredentials`) ;
- `defaults` (headers/timeout/retries) ;
- `singleFlight` (déduplication “in-flight” des requêtes HTTP identiques `GET/HEAD/OPTIONS`) ;
- `debug` (logs runtime) ;
- `extraInterceptors` (interceptors Angular additionnels).

Les comportements HTTP internes du bridge s'appliquent uniquement aux requêtes
appartenant à l'origine et au chemin de `baseUrl`. Les interceptors personnalisés
restent responsables de leur propre périmètre.

### Cookies / `withCredentials`

- `http.withCredentials` (défaut `false`) : credentials sur les requêtes HTTP cross-origin ; surchargeable appel par appel via `opts.withCredentials`.
- `mercure.withCredentials` (défaut `true`) : cookies sur la connexion SSE, pour transmettre au hub le cookie d'abonné `__Secure-mercure_access_token`.

Les cookies same-origin suivent le comportement normal du navigateur.

```ts
import {provideBridge} from '@app/bridge';

provideBridge({
  baseUrl: 'https://api.example.com',
  http: {withCredentials: true},
  mercure: {hubUrl: 'https://api.example.com/.well-known/mercure'},
});
```

### Auth (Bearer)

`auth` accepte :
- une string (token Bearer),
- `{ type: 'bearer', token }`,
- `{ type: 'bearer', getToken }` (sync ou async),
- ou un `HttpInterceptorFn` custom.

Le Bearer intégré est ajouté uniquement aux requêtes dont l’origine et le chemin
appartiennent au `baseUrl` configuré. Une requête vers un autre service conserve
donc ses en-têtes d’origine. Un interceptor custom garde le comportement Angular
standard et reste responsable de son propre périmètre.

```ts
import {provideBridge} from '@app/bridge';

provideBridge({
  baseUrl: 'https://api.example.com',
  auth: {type: 'bearer', getToken: () => localStorage.getItem('token') ?? undefined},
});
```

### Defaults (headers / timeout / retries)

```ts
import {provideBridge} from '@app/bridge';

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
import {provideBridge} from '@app/bridge';

provideBridge({baseUrl: 'https://api.example.com', debug: true});
```

## Appeler l’API

### Style orienté ressource (`FacadeFactory` + `ResourceFacade<T>`)

```ts
import {inject} from '@angular/core';
import {FacadeFactory, ResourceFacade, Item} from '@app/bridge';

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
import {BridgeFacade} from '@app/bridge';

export class HealthService {
  private readonly bridge = inject(BridgeFacade);
  getHealth$() {
    return this.bridge.get$<{status: string}>('/health');
  }
}
```

## Realtime (Mercure/SSE)

Le realtime est inactif tant que `mercure.hubUrl` n’est pas fourni à `provideBridge()`. Le hub doit implémenter [Mercure 1.0](https://mercure.rocks/spec).

`watch$()` écoute une **ressource** via `match_urlpattern` (par défaut `{url}/:id`).
`watch$(iri)` écoute un item précis via `match`, avec une IRI relative ou absolue.
Les deux émettent des `ResourceEvent<T>` : `upsert` avec la ressource reçue,
`delete` avec l'IRI supprimée.

```ts
import {inject, Injectable} from '@angular/core';
import {tap} from 'rxjs';
import {FacadeFactory, IriRequired} from '@app/bridge';
import {BookStore} from './book.store';

@Injectable({providedIn: 'root'})
export class BooksRepository {
  private readonly store = inject(BookStore);
  private readonly books = inject(FacadeFactory).create<Book>({url: '/api/books'});

  fetch$(iri: IriRequired) {
    return this.books.get$(iri).pipe(tap((book) => this.store.upsert(book)));
  }

  watch$(iri?: IriRequired) {
    return this.books.watch$(iri).pipe(tap((event) => {
      if (event.kind === 'delete') this.store.remove(event.iri);
      else this.store.upsert(event.data);
    }));
  }
}
```

`BookStore` est un store de l'application. Les appels GET et les événements Mercure
alimentent les mêmes entités ; les composants affichent leurs signaux, éventuellement
exposés par un service. Configurez API Platform pour publier la même représentation
complète que GET : le bridge ne fait pas de GET complémentaire et n'expanse pas les
relations. Les relations par IRI sont chargées à la demande par l'application.

- Une seule connexion SSE est partagée par toute l’application ; elle est rouverte avec `last_event_id`, s'il est disponible, quand les abonnements changent. La reprise dépend de l'historique du hub et du curseur disponible ; l'application organise sa synchronisation initiale et ses éventuelles resynchronisations.
- Le désabonnement se fait avec `unsubscribe()`.
- API Platform publie les suppressions avec `{"@id": ...}` (éventuellement `@type`) ; le repository applique l'événement `delete` en retirant l'entité du store.
- Les publications et topics nécessaires à la cohérence entre entités liées sont configurés par le développeur côté backend.
- Authentification : cookie HttpOnly `__Secure-mercure_access_token` posé par le backend (jamais de token dans l’URL ni en JavaScript).
- IRIs d’item non standard : `factory.create<Book>({url: '/api/books', topic: '/api/library/books/:isbn'})`.
- État : `ResourceFacade.connectionStatus`, `BridgeFacade.realtimeStatus$()`, `BridgeFacade.realtimeDiagnostics$()`.
- Navigateurs : l'écoute par pattern nécessite `URLPattern` (sinon chargez `urlpattern-polyfill` dans l'application).

Note SSR : la connexion SSE ne s’ouvre que dans le navigateur.

### Single-flight HTTP

Côté HTTP, le bridge déduplique les requêtes identiques tant qu’elles sont en cours (single-flight, activé par défaut) :
- `GET` / `HEAD` / `OPTIONS` : deux appels identiques partagent le même appel réseau et reçoivent la même réponse ;
- les méthodes avec body (`POST`/`PUT`/`PATCH`/`DELETE`) ne sont pas dédupliquées.

Ce n’est pas un cache : une fois la requête terminée, un nouvel appel identique relance un nouvel appel réseau.

Pour désactiver :

```ts
provideBridge({baseUrl: 'https://api.example.com', singleFlight: false});
```

## Models TypeScript

Les models générés (si présents) sont exportés au même niveau que le runtime :

```ts
import type {Item} from '@app/bridge';
// import type {Book} from '@app/bridge';
```

En JSON-LD (`application/ld+json`), l’IRI est typiquement dans `model['@id']`.

---

## Documentation du projet

# Foundation Webfront

Frontend Angular 22 + Spartan UI + Tailwind 4 du template Foundation.
Il est relie au backend via le bridge Meridiane genere localement.

## Workflow nominal

```bash
docker compose up --build -d
make lint
make build
```

Le flux standard du repo est Docker-first.
Les scripts `npm run ...` restent les primitives du conteneur `webfront`, mais la DX nominale passe par le `Makefile` racine.

## Bridge

Le bridge vit dans `webfront/bridge/` et est versionne dans le repo.
Quand le contrat backend change :

```bash
make bridge
```

## Conventions frontend

- Angular 22 standalone, zoneless et `OnPush` par defaut ;
- Spartan UI comme unique kit d'interface ;
- primitives Helm generees dans `src/app/shared/ui/`, gerees exclusivement par le CLI et jamais modifiees manuellement ;
- pages et composites applicatifs composes hors de `src/app/shared/ui/` ;
- une seule feuille globale `src/styles.css`, une palette neutre noire et les modes `light` / `dark` ;
- classes Tailwind standard dans le code applicatif, sans valeurs arbitraires ;
- icones Lucide uniquement ;
- code compatible zoneless ;
- architecture `store -> repository -> service -> composant` ;
- `AppTable` pour les listes paginees standard ;
- aucune modification manuelle du bridge.

## Documentation

- scope frontend : `webfront/AGENTS.md`
- guide frontend : `webfront/docs/README.md`
- source de verite UI : `webfront/docs/ui/spartan.md`
- docs projet durables : `docs/project/README.md`
- pattern bridge : `.codex/patterns/bridge/contract-generation.md`
