# API publique du bridge (Angular)

Surface publique exposée par le package bridge généré : `provideBridge`, les facades, et les types.

## `provideBridge(...)`

`provideBridge()` configure `HttpClient` (fetch + interceptors) et fournit les tokens internes nécessaires au bridge.

Options :

- `baseUrl` : URL de base du backend (ex: `https://api.example.com`) (requis)
- `auth` : configuration Bearer (token direct ou `getToken()`) ou interceptor custom
- `mercure` : `{ hubUrl, init, topicMode? }` pour activer le realtime Mercure
- `defaults` : headers/timeout/retries appliqués par défaut
- `extraInterceptors` : injecter vos interceptors Angular
- `debug` : active des logs runtime (HTTP + Mercure) via le logger du bridge

### `mercure.topicMode`

`topicMode` contrôle la valeur envoyée dans les paramètres `topic=` du hub :

- `url` (défaut) : topic absolu (ex: `http://localhost:8000/api/...`)
- `iri` : topic relatif same-origin (ex: `/api/...`)

En pratique : `url` correspond au comportement “par défaut” (topics ABS_URL côté backend).

## `FacadeFactory`

Crée une façade typée par ressource (repo REST + realtime) : `factory.create<T>({ url })`.

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

## Types utiles

- `Item`, `Iri`, `Collection<T>`
- `Query` (pagination + filtres)
- `BridgeDefaults`, `BridgeLogger`, `MercureTopicMode`
