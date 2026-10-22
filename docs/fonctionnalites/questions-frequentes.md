# FAQ

## Pourquoi un bridge par backend ?

Chaque backend garde sa propre spec OpenAPI, ses modèles et son cycle de release. Cela évite de mélanger plusieurs contrats dans un seul package.

## `meridiane dev` peut-il être lancé sans `packageName` ?

Oui, dans ce repo uniquement. Sans argument, il cible `@obsidiane/bridge-sandbox` et applique les defaults de `playground/angular-app`.

## Que se passe-t-il si la spec est indisponible en mode `dev` sandbox ?

Si vous n'avez pas passé `--spec` explicitement, Meridiane tente une résolution automatique puis bascule en `--no-models` si la spec reste inaccessible.

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

Non. `upsert.data` contient la ressource reçue et `delete.iri` identifie celle à
retirer du store. Pour appliquer directement `upsert.data`, configurez API Platform
pour publier la même représentation complète que GET.

## Comment activer les logs ?

- CLI : `meridiane ... --debug`
- Runtime Angular : `provideBridge({ debug: true, ... })`

## Comment gérer l'auth ?

`auth` supporte :
- string Bearer,
- `{ type: 'bearer', token }`,
- `{ type: 'bearer', getToken }` (sync/async),
- `HttpInterceptorFn` custom.

Le Bearer intégré est limité à l’origine et au chemin du `baseUrl` fourni à
`provideBridge()`. Les requêtes HTTP de l’application vers d’autres services ne
reçoivent pas ce token. Le périmètre d’un interceptor custom reste à la charge de
son implémentation.

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

- génération contract-driven : seuls les schémas atteignables via `paths` et formats sélectionnés sont conservés
- les schémas `*jsonMergePatch*` ne génèrent pas de modèle dédié (`PATCH` est typé `Partial<T>`)
