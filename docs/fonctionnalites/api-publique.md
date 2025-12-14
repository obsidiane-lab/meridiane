# API publique du bridge (Angular)

Cette page fait partie des docs de fonctionnalités.

Cette page décrit la surface d’API “publique” exposée par le package bridge généré.
L’idée est de fournir des points d’entrée stables, plutôt que de naviguer dans les fichiers internes.

Note : les tokens internes (InjectionToken) ne sont pas destinés à être consommés directement.
La surface publique est volontairement petite : `provideBridge`, les facades, et les types.

## `provideBridge(...)`

`provideBridge()` configure `HttpClient` (fetch + interceptors) et fournit les tokens internes nécessaires au bridge.

Options principales :

- `baseUrl` : URL de base du backend (ex: `https://api.example.com`)
- `auth` : configuration Bearer (token direct ou `getToken()`) ou interceptor custom
- `mercure` : `{ hubUrl, init, topicMode? }` pour activer le realtime Mercure
- `defaults` : headers/timeout/retries appliqués par défaut
- `extraInterceptors` : injecter vos interceptors Angular
- `debug` : active des logs runtime (HTTP + Mercure) via le logger du bridge

Compat :

- `apiBaseUrl` et `mercureHubUrl` restent acceptés pour compatibilité avec les signatures plus anciennes

### `mercure.topicMode`

`topicMode` contrôle la valeur envoyée dans les paramètres `topic=` du hub :

- `url` (défaut) : topic absolu (ex: `http://localhost:8000/api/...`)
- `iri` : topic relatif same-origin (ex: `/api/...`)

En pratique : `url` correspond au comportement “par défaut” (topics ABS_URL côté backend).

## `FacadeFactory`

`FacadeFactory` crée une façade typée par ressource.
Le bridge centralise ainsi la création des repositories REST et l’accès au realtime.

## `BridgeFacade`

`BridgeFacade` est le helper “cas spécifiques” : endpoints custom, routes non Hydra, etc.
Il est fourni en tant que service Angular (`providedIn: 'root'`) et expose une API libre où chaque appel reçoit explicitement une `url`.

Il expose aussi les helpers SSE/Mercure : `watch$` / `unwatch`.

## `ResourceFacade<T>`

Une `ResourceFacade<T>` expose une API orientée usage :

- `getCollection$(query?, opts?)`, `get$(iri, opts?)`
- `post$(payload, opts?)`, `patch$(iri, changes, opts?)`, `put$(iri, payload, opts?)`, `delete$(iri, opts?)`
- `request$({ method, url?, query?, body?, headers?, responseType?, withCredentials?, options? })`
- `watch$(iri|iri[])` / `unwatch(iri|iri[])` pour Mercure/SSE
- `watchSubResource$(iri|iri[], field)` pour filtrer des événements “enfants” sur un topic “parent”

Note : `iri` doit être une string (ex: `item['@id']!`). Le type `Iri` peut être `undefined` car un `Item` n’a pas forcément d’IRI tant qu’il n’est pas persisté.

Le typage s’appuie sur `Item` (IRI `@id`) et une structure de collection compatible Hydra.

## Types utiles

Le bridge expose des types utilitaires tels que :

- `Item`, `Iri`, `Collection<T>`
- `Query` (pagination + filtres)
- `BridgeDefaults`, `BridgeLogger`, `MercureTopicMode`
