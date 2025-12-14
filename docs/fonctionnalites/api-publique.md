# API publique du bridge (Angular)

Surface publique exposée par le package bridge généré : `provideBridge`, les facades, et les types utilitaires.

## `provideBridge(...)`

`provideBridge()` enregistre tout ce dont le bridge a besoin :
- un `HttpClient` basé sur Fetch (`withFetch()`) ;
- les interceptors du runtime (headers API Platform, defaults, auth, debug) ;
- les tokens de configuration (base URL, defaults, Mercure, logger).

Options :

- `baseUrl` : URL de base du backend (ex: `https://api.example.com`) (requis)
- `auth` : configuration Bearer (token direct ou `getToken()`) ou interceptor custom
- `mercure` : `{ hubUrl, init, topicMode? }` pour activer le realtime Mercure
- `defaults` : headers/timeout/retries appliqués par défaut
- `singleFlight` : déduplique les requêtes HTTP identiques “in-flight” (par défaut `true`, uniquement `GET/HEAD/OPTIONS`)
- `extraInterceptors` : injecter vos interceptors Angular
- `debug` : active des logs runtime (HTTP + Mercure) via le logger du bridge

Note : `provideBridge()` fournit déjà `HttpClient`. Évitez de rajouter un `provideHttpClient()` séparé, sauf si vous savez exactement comment vous combinez les features.

### `mercure.topicMode`

`topicMode` contrôle la valeur envoyée dans les paramètres `topic=` du hub :

- `url` (défaut) : topic absolu (ex: `http://localhost:8000/api/...`)
- `iri` : topic relatif same-origin (ex: `/api/...`)

En pratique : `url` correspond au comportement “par défaut” (topics ABS_URL côté backend).

### Cookies / `withCredentials`

Le bridge calcule une valeur “par défaut” de `withCredentials` (HTTP et SSE) à partir de `mercure.init` :
- `credentials: 'include'` (défaut) → cookies envoyés
- `credentials: 'omit'` → cookies non envoyés

Ensuite, chaque appel HTTP peut surcharger ponctuellement via `opts.withCredentials`.

## `FacadeFactory`

Crée une façade typée par ressource (repo REST + realtime) : `factory.create<T>({ url })`.

Exemple :

```ts
import {inject} from '@angular/core';
import {FacadeFactory, Item} from '@acme/backend-bridge';

type Conversation = Item & {title?: string};

const factory = inject(FacadeFactory);
const conversations = factory.create<Conversation>({url: '/api/conversations'});
```

## `BridgeFacade`

Helper “ad-hoc” (endpoints custom, routes non Hydra) + helpers SSE/Mercure (`watch$` / `unwatch`).

## `ResourceFacade<T>`

API “ressource” :

- `getCollection$(query?, opts?)`, `get$(iri, opts?)`
- `post$(payload, opts?)`, `patch$(iri, changes, opts?)`, `put$(iri, payload, opts?)`, `delete$(iri, opts?)`
- `request$({ method, url?, query?, body?, headers?, responseType?, withCredentials?, options? })`
- `watch$(iri|iri[])` / `unwatch(iri|iri[])` pour Mercure/SSE
- `watchSubResource$(iri|iri[], field)` pour filtrer des événements “enfants” sur un topic “parent”

Notes :
- `iri` = string (souvent `item['@id']!`). Un `Item` peut ne pas avoir d’IRI avant persistance.
- le typage s’appuie sur `Item` + une collection compatible Hydra.
- Mercure/SSE est mutualisé : une seule connexion SSE est maintenue, et les topics sont gérés en ref-count (pas de doublons pour la même ressource).

## Types utiles

- `Item`, `Iri`, `Collection<T>`
- `Query` (pagination + filtres)
- `BridgeDefaults`, `BridgeLogger`, `MercureTopicMode`
