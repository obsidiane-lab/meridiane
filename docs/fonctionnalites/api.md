# API publique

Surface publique exposée par le bridge généré (`public-api.ts`).

## Exports principaux

- `provideBridge()`
- `BridgeOptions`, `BridgeDefaults`, `BridgeLogger`, `MercureTopicMode`
- `FacadeFactory`, `ResourceFacade<T>`, `BridgeFacade`
- Types HTTP : `Item`, `Iri`, `Collection<T>`, `Query`, `HttpRequestConfig`, `HttpCallOptions`
- Utils : `joinUrl`, `resolveUrl`

## `provideBridge(...)`

Configure le runtime HTTP/SSE et expose les tokens internes.

Options :

- `baseUrl` : URL de base du backend (requis)
- `auth` : Bearer token (string ou objet) ou `HttpInterceptorFn`
- `mercure` : `{ hubUrl, init, topicMode? }` pour activer le realtime
- `defaults` : headers/timeout/retries appliqués par défaut
- `singleFlight` : déduplication des requêtes HTTP in-flight (par défaut `true`)
- `debug` : logs runtime (HTTP + Mercure)
- `extraInterceptors` : interceptors Angular additionnels

Exemple :

```ts
provideBridge({
  baseUrl: 'https://api.example.com',
  auth: {type: 'bearer', getToken: () => localStorage.getItem('token') ?? undefined},
  mercure: {hubUrl: 'https://api.example.com/.well-known/mercure'},
});
```

## `FacadeFactory` + `ResourceFacade<T>`

Crée une façade typée par ressource (repo REST + realtime) :

```ts
const factory = inject(FacadeFactory);
const books = factory.create<Book>({url: '/api/books'});
```

API `ResourceFacade<T>` :
- `getCollection$(query?, opts?)`, `get$(iri, opts?)`
- `post$(payload, opts?)`, `patch$(iri, changes, opts?)`, `put$(iri, payload, opts?)`, `delete$(iri, opts?)`
- `request$({ method, url?, query?, body?, headers?, responseType?, withCredentials?, options? })`
- `watch$(iri|iri[])`, `unwatch(iri|iri[])`
- `watchSubResource$(iri|iri[], field)`
- `connectionStatus` : signal SSE (`connecting` | `connected` | `closed`)

Note : utilisez `FacadeFactory` pour instancier les `ResourceFacade` (contexte d’injection).

## `BridgeFacade`

Façade ad-hoc pour endpoints non Hydra + helpers SSE/Mercure (`watch$` / `unwatch`).

## Types utiles

- `Item`, `Iri`, `Collection<T>`, `Query`
- `HttpRequestConfig`, `HttpCallOptions`
- `BridgeDefaults`, `BridgeLogger`, `MercureTopicMode`
