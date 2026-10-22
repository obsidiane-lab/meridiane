# Référence

Tout ce qui est exporté par le bridge (`public-api.ts`).

## `provideBridge()`

| Option | Type | Défaut | Rôle |
|---|---|---|---|
| `baseUrl` | `string` | requis | URL de l'API. Relative (`/`) = même origine que la page. |
| `auth` | `string` \| `{type: 'bearer', token}` \| `{type: 'bearer', getToken}` \| `HttpInterceptorFn` | — | Ajoute l'authentification aux requêtes vers `baseUrl`. `getToken` peut être asynchrone. |
| `http.withCredentials` | `boolean` | `false` | Cookies sur les requêtes cross-origin. |
| `mercure.hubUrl` | `string` | — | Active le temps réel. Une URL relative est résolue contre `baseUrl`. |
| `mercure.authorize` | `string` \| `() => Promise<unknown>` | — | Endpoint (GET) ou fonction qui pose le cookie Mercure, avant la première connexion et après chaque refus. |
| `mercure.withCredentials` | `boolean` | `true` | Envoie les cookies au hub. |
| `mercure.maxUrlLength` | `number` | `4000` | Longueur maximale d'une URL d'abonnement avant d'ouvrir une autre connexion. |
| `defaults.headers` | `Record<string, string>` | — | En-têtes ajoutés s'ils sont absents. |
| `defaults.timeoutMs` | `number` | — | Interrompt la requête au-delà de ce délai. |
| `defaults.retries` | `number` \| `{count, delayMs?, methods?}` | — | Rejoue les erreurs réseau, 429 et 5xx. Méthodes par défaut : GET, HEAD, OPTIONS ; délai par défaut : 250 ms. |
| `singleFlight` | `boolean` | `true` | Fusionne les GET/HEAD/OPTIONS identiques en cours. |
| `debug` | `boolean` | `false` | Journalise HTTP et Mercure dans la console. |
| `extraInterceptors` | `HttpInterceptorFn[]` | `[]` | Ajoutés après ceux du bridge, appliqués à toutes les requêtes. |

## `FacadeFactory`

```ts
inject(FacadeFactory).create<Project>({url: '/api/projects'});
```

| Option | Rôle |
|---|---|
| `url` | Chemin de la collection. |
| `topic` | URL Pattern des IRI d'item, si elles ne suivent pas `{url}/:id` (ex. `/api/library/books/:isbn`). |
| `realtime` | Autre implémentation de `RealtimePort` (rarement utile). |

## `ResourceFacade<T>`

| Méthode | Retour | Requête |
|---|---|---|
| `getCollection$(query?, options?)` | `Observable<Collection<T>>` | `GET {url}` |
| `get$(iri, options?)` | `Observable<T>` | `GET {iri}` |
| `post$(payload, options?)` | `Observable<T>` | `POST {url}` |
| `put$(iri, payload, options?)` | `Observable<T>` | `PUT {iri}` |
| `patch$(iri, changes, options?)` | `Observable<T>` | `PATCH {iri}` (merge-patch) |
| `delete$(iri, options?)` | `Observable<void>` | `DELETE {iri}` |
| `request$<R, B>(config)` | `Observable<R>` | requête libre, `url` par défaut = `{url}` |
| `watch$(iri?, {connection?})` | `Observable<T \| ResourceDeletion>` | sans IRI : toute la ressource ; avec : un item |
| `connectionStatus` | `Signal<RealtimeStatus>` | état des connexions Mercure |

`options` (`HttpCallOptions`) : `{headers?, withCredentials?}`.

`config` (`HttpRequestConfig`) : `{method, url?, query?, body?, headers?, responseType?: 'json' | 'text' | 'blob', withCredentials?}`.

## `BridgeFacade`

| Méthode | Rôle |
|---|---|
| `get$`, `getCollection$`, `post$`, `put$`, `patch$`, `delete$` | Mêmes méthodes que `ResourceFacade`, avec l'URL en premier argument. |
| `request$(config)` | Requête libre ; `url` obligatoire. |
| `watch$<T>({match, type?}, {connection?})` | Flux JSON brut d'un topic explicite. `type` : `'exact'` (défaut) ou `'urlpattern'`. Connexion `'dedicated'` par défaut. |
| `reconnectRealtime()` | Renouvelle l'autorisation et rouvre les connexions (login, logout). |
| `realtimeStatus$()` | `Observable<RealtimeStatus>`. |
| `realtimeDiagnostics$()` | `Observable<RealtimeDiagnostics>`. |

## Connexions (`connection`)

| Valeur | Effet |
|---|---|
| `'shared'` (défaut) | Connexions partagées par toute l'application. |
| `'dedicated'` | Une connexion propre à cet abonnement, fermée avec lui. |
| autre nom | Connexions partagées par les abonnements qui utilisent ce nom. |

## Types

| Type | Contenu |
|---|---|
| `Iri` | `string` : IRI (`/api/projects/1`) ou URL absolue. |
| `Item` | `{'@id'?, '@type'?, '@context'?}`, base des modèles JSON-LD. |
| `Collection<T>` | `{member: T[], totalItems?, view?, search?}`. |
| `Query` | `{page?, itemsPerPage?, filters?}`. `AnyQuery` accepte aussi un objet libre ou des `HttpParams`. |
| `ResourceDeletion` | `{'@id': string, '@type'?: string \| string[]}`. |
| `isResourceDeletion(payload)` | `true` si le payload ne contient que `@id` (et `@type`). |
| `RealtimeStatus` | `'closed'` \| `'connecting'` \| `'connected'`. `connected` quand toutes les connexions sont ouvertes. |
| `RealtimeDiagnostics` | `{status, connections: [{connection, status, url, subscriptions, lastEventId, failures}]}`. |
| `BridgeOptions`, `BridgeAuth`, `BridgeHttpOptions`, `BridgeMercureOptions`, `BridgeDefaults`, `BridgeLogger` | Types de configuration. |
| `MercureSubscription`, `MercureUpdate`, `RealtimePort`, `RealtimeConnection`, `RealtimeSubscribeOptions`, `RealtimeSelector` | Types du temps réel. |
| `FacadeConfig`, `ResourceRepository<T>`, `Facade<T>`, `HttpCallOptions`, `HttpRequestConfig`, `HttpMethod` | Types des façades et du HTTP. |
| Modèles | Générés depuis le contrat, exportés par `./models`. |
