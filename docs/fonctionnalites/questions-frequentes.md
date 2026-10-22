# FAQ

## Pourquoi un bridge par backend ?

Chaque backend garde sa propre spec OpenAPI, ses modèles et son cycle de release. Cela évite de mélanger plusieurs contrats dans un seul package.

## Comment choisir les formats des modèles générés ?

Meridiane lit le contrat OpenAPI tel quel, sans sélection de format. Les formats
exposés se configurent dans API Platform (`api_platform.formats`) ; les
représentations de même forme d'une ressource donnent un seul modèle. Les
endpoints au format particulier passent par `request$`.

## Mercure est-il obligatoire ?

Non. Sans `mercure.hubUrl`, le runtime SSE est désactivé et le bridge fonctionne en HTTP uniquement.

## Faut-il écouter toute une ressource ou un item ?

`watch$()` écoute la ressource entière via `match_urlpattern`, y compris les nouveaux
items encore absents du store. `watch$(iri)` écoute un item précis via `match` et
accepte une IRI relative ou absolue. Le repository choisit selon les besoins de
l'application ; chaque abonnement est libéré avec `unsubscribe()`.

## Le bridge fonctionne-t-il avec un hub Mercure 0.x ?

Non. Meridiane 3.0 parle le protocole Mercure 1.0 (`match`, `match_urlpattern`, `last_event_id`, cookie `__Secure-mercure_access_token`).

## Où gérer les relations et les stores ?

Dans l'application consommatrice. Le bridge type les ressources et transmet leur
JSON. Le repository alimente le store à signaux depuis HTTP et Mercure ; les
services gèrent la logique métier, l'agrégation et le chargement des relations par
IRI. Le développeur configure les publications et topics nécessaires pour
actualiser les ressources liées.

## Un événement Mercure provoque-t-il un GET ?

Non. `watch$()` transmet directement la ressource JSON reçue. Pour l'appliquer au
store, configurez API Platform pour publier la même représentation complète que
GET. Une suppression transmet le payload `{"@id": ...}` et l'éventuel `@type` ;
`isResourceDeletion(resource)` permet au repository de retirer `resource['@id']`
du store.

## Comment activer les logs ?

- CLI : `meridiane ... --debug`
- Runtime Angular : `provideBridge({ debug: true, ... })`

## Comment gérer l'auth ?

`auth` supporte :
- string Bearer,
- `{ type: 'bearer', token }`,
- `{ type: 'bearer', getToken }` (sync/async),
- `HttpInterceptorFn` custom.

L'auth, Bearer intégré ou interceptor custom, est limitée à l’origine et au chemin
du `baseUrl` fourni à `provideBridge()`. Les requêtes HTTP de l’application vers
d’autres services ne reçoivent pas ce token ; un interceptor global se déclare
dans `extraInterceptors`.

## Comment gérer les cookies (`withCredentials`) ?

Pour le HTTP :
- `provideBridge({http: {withCredentials: true}})` active les credentials cross-origin
- `provideBridge({http: {withCredentials: false}})` les désactive

Le défaut HTTP est `false`.

Pour Mercure/SSE :
- `mercure.withCredentials: true` (défaut) envoie le cookie d'abonné au hub
- `mercure.withCredentials: false` désactive les credentials cross-origin

Les cookies same-origin suivent le comportement normal du navigateur. Pour HTTP,
vous pouvez surcharger appel par appel via `HttpCallOptions.withCredentials`.

## Le bridge supporte-t-il SSR ?

La partie SSE n'est jamais ouverte côté serveur. Le reste du runtime HTTP dépend de votre stratégie SSR/fetching.

## Limites connues de génération de modèles

- tous les schémas de `components.schemas` sont générés, hors `Hydra*` ; les représentations de même forme d'une ressource sont fusionnées
- les schémas `*jsonMergePatch*` ne génèrent pas de modèle dédié (`PATCH` est typé `Partial<T>`)
