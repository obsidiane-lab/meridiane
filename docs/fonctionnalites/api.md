# API publique

Surface exposée par le bridge généré avec Meridiane 3.0 (`src/public-api.ts`).

## Exports principaux

- Runtime/config : `provideBridge`, `BridgeOptions`, `BridgeAuth`, `BridgeHttpOptions`, `BridgeMercureOptions`
- Types bridge : `BridgeDefaults`, `BridgeLogger`, `RealtimeStatus`, `RealtimeDiagnostics`, `RealtimeSubscriptionDiagnostics`
- Facades : `FacadeFactory`, `ResourceFacade<T>`, `BridgeFacade`
- Types utilitaires facades : `FacadeConfig<T>`, `ResourceDeletion`
- Types HTTP/Hydra : `Item`, `Iri`, `IriRequired`, `Collection<T>`, `Query`, `AnyQuery`, `HttpCallOptions`, `HttpRequestConfig`, `HttpMethod`
- Ports : `ResourceRepository<T>`, `RealtimePort`, `MercureSubscription`, `MercureUpdate`, `Facade<T>`
- Utils URL : `joinUrl`, `resolveUrl`
- Helper ressources : `isResourceDeletion`
- Models générés : exports de `./models`

## `provideBridge(opts)`

`baseUrl` est requis.

Options notables :
- `auth` : string bearer, objet bearer (token/getToken), ou `HttpInterceptorFn`
- `http.withCredentials` : credentials/cookies HTTP par défaut (`false` par défaut)
- `mercure.hubUrl` : active le realtime (hub Mercure 1.0)
- `mercure.withCredentials` : envoie le cookie d'abonné au hub (`true` par défaut)
- `defaults` : headers/timeout/retries appliqués aux requêtes du `baseUrl`
- `singleFlight` : déduplication HTTP in-flight sur le `baseUrl` (`true` par défaut)
- `debug` : logs runtime
- `extraInterceptors` : interceptors Angular additionnels

## `FacadeFactory` + `ResourceFacade<T>`

Construction :

```ts
const factory = inject(FacadeFactory);
const books = factory.create<Book>({url: '/api/books'});
// topic Mercure par défaut : {baseUrl}/api/books/:id, surchargeable avec `topic`
```

API principale `ResourceFacade<T>` :
- `getCollection$(query?, opts?)`, `get$(iri, opts?)`
- `post$(payload, opts?)`, `patch$(iri, changes, opts?)`, `put$(iri, payload, opts?)`, `delete$(iri, opts?)`
- `request$({method, url?, query?, body?, headers?, responseType?, withCredentials?, options?})`
- `watch$(iri?: IriRequired)` : `Observable<T | ResourceDeletion>`. Émet directement la ressource JSON reçue pour une création ou modification et le payload `{"@id": ...}` pour une suppression, en conservant aussi les éventuels `@type` et `@context`. Sans IRI, écoute la ressource via `match_urlpattern` ; avec une IRI relative ou absolue, écoute cet item via `match`. Le désabonnement se fait avec `unsubscribe()`.
- `connectionStatus` (`'connecting' | 'connected' | 'closed'`)

## `BridgeFacade`

HTTP ad-hoc :
- `get$`, `getCollection$`, `post$`, `patch$`, `put$`, `delete$`, `request$`

Realtime :
- `realtimeStatus$()`
- `realtimeDiagnostics$()`

## Types utiles

- `Item` contient les champs Hydra/JSON-LD usuels (`@id`, `@type`, `@context`)
- `ResourceDeletion` étend `Item` avec un `@id: string` requis et les métadonnées optionnelles `@type` et `@context`
- `isResourceDeletion(payload: Item): payload is ResourceDeletion` reconnaît un payload de suppression limité à `@id` et ses éventuelles métadonnées `@type` et `@context`
- `watch$()` conserve le JSON reçu, sans expansion des relations ni GET complémentaire ; le repository de l'application décide comment l'appliquer à son store
- `Collection<T>` expose `member`, `totalItems`, `view`, `search`
- `HttpRequestConfig` sert d'escape hatch pour les endpoints non standards
- `RealtimeDiagnostics` expose l'état de la connexion SSE unique (statut, URL, abonnements, `lastEventId`, échecs)
