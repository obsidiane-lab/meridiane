# API publique

Surface exposée par le bridge généré (`src/public-api.ts`).

## Exports principaux

- Runtime/config : `provideBridge`, `BridgeOptions`, `BridgeAuth`, `BridgeMercureOptions`
- Types bridge : `BridgeDefaults`, `BridgeLogger`, `MercureTopicMode`, `MercureConnectionMode`, `WatchConnectionOptions`, `RealtimeDiagnostics`
- Facades : `FacadeFactory`, `ResourceFacade<T>`, `BridgeFacade`
- Types utilitaires facades : `FacadeConfig<T>`, `TypedEvent`, `WatchTypesResult<R>`, `WatchTypesConfig`
- Types HTTP/Hydra : `Item`, `Iri`, `Collection<T>`, `Query`, `AnyQuery`, `HttpCallOptions`, `HttpRequestConfig`, `HttpMethod`
- Ports : `ResourceRepository<T>`
- Utils URL : `joinUrl`, `resolveUrl`
- Models générés : exports de `./models`

## `provideBridge(opts)`

`baseUrl` est requis.

Options notables :
- `auth` : string bearer, objet bearer (token/getToken), ou `HttpInterceptorFn`
- `mercure.hubUrl` : active le realtime
- `mercure.topicMode` : `'url'` (défaut) ou `'iri'`
- `mercure.connectionMode` : `'auto'` (défaut) ou `'single'`
- `mercure.maxUrlLength` : seuil de découpage URL en mode `auto` (défaut `1900`)
- `mercure.init` : options `EventSource` (notamment `credentials`)
- `defaults` : headers/timeout/retries globaux
- `singleFlight` : déduplication HTTP in-flight (`true` par défaut)
- `debug` : logs runtime
- `extraInterceptors` : interceptors Angular additionnels

## `FacadeFactory` + `ResourceFacade<T>`

Construction :

```ts
const factory = inject(FacadeFactory);
const books = factory.create<Book>({url: '/api/books'});
```

API principale `ResourceFacade<T>` :
- `getCollection$(query?, opts?)`, `get$(iri, opts?)`
- `post$(payload, opts?)`, `patch$(iri, changes, opts?)`, `put$(iri, payload, opts?)`, `delete$(iri, opts?)`
- `request$({method, url?, query?, body?, headers?, responseType?, withCredentials?, options?})`
- `watch$(iri|iri[], options?)`, `unwatch(iri|iri[])`
- `watchSubResource$(iri|iri[], field, options?)`
- `connectionStatus` (`'connecting' | 'connected' | 'closed'`)

`options` de watch = `WatchConnectionOptions` (`{ newConnection?: boolean }`).

## `BridgeFacade`

HTTP ad-hoc :
- `get$`, `getCollection$`, `post$`, `patch$`, `put$`, `delete$`, `request$`

Realtime :
- `watch$(iri|iri[], filter?, options?)`
- `watchTypes$(iri|iri[], resourceTypes, cfg?, options?)`
- `unwatch(iri|iri[])`
- `realtimeDiagnostics$()`

`watchTypes$()` :
- discrimine les événements sur `cfg.discriminator` (défaut `@type`)
- renvoie des événements `{ resourceType, payload }`

## Types utiles

- `Item` contient les champs Hydra/JSON-LD usuels (`@id`, `@type`, `@context`)
- `Collection<T>` expose `member`, `totalItems`, `view`, `search`
- `HttpRequestConfig` sert d'escape hatch pour les endpoints non standards
- `RealtimeDiagnostics` expose l'état courant des connexions SSE (shared/dedicated)
