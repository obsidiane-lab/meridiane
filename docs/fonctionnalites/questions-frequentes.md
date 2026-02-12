# FAQ

## Pourquoi un bridge par backend ?

Chaque backend garde sa propre spec OpenAPI, ses modèles et son cycle de release. Cela évite de mélanger plusieurs contrats dans un seul package.

## `meridiane dev` peut-il être lancé sans `packageName` ?

Oui, dans ce repo uniquement. Sans argument, il cible `@obsidiane/bridge-sandbox` et applique les defaults de `apps/sandbox`.

## Que se passe-t-il si la spec est indisponible en mode `dev` sandbox ?

Si vous n'avez pas passé `--spec` explicitement, Meridiane tente une résolution automatique puis bascule en `--no-models` si la spec reste inaccessible.

## Mercure est-il obligatoire ?

Non. Sans `mercure.hubUrl`, le runtime SSE est désactivé et le bridge fonctionne en HTTP uniquement.

## Comment obtenir une isolation stricte d'un topic avec `watchTypes$` ?

Utilisez une connexion dédiée (`{newConnection: true}`) ou configurez `connectionMode: 'single'`.

## Comment activer les logs ?

- CLI : `meridiane ... --debug`
- Runtime Angular : `provideBridge({ debug: true, ... })`

## Comment gérer l'auth ?

`auth` supporte :
- string Bearer,
- `{ type: 'bearer', token }`,
- `{ type: 'bearer', getToken }` (sync/async),
- `HttpInterceptorFn` custom.

## Comment gérer les cookies (`withCredentials`) ?

Le défaut est dérivé de `mercure.init.credentials` :
- `include` (défaut) : cookies envoyés
- `omit` : cookies non envoyés

Vous pouvez surcharger appel par appel via `HttpCallOptions.withCredentials`.

## Le bridge supporte-t-il SSR ?

La partie SSE n'est jamais ouverte côté serveur. Le reste du runtime HTTP dépend de votre stratégie SSR/fetching.

## Limites connues de génération de modèles

- génération contract-driven : seuls les schémas atteignables via `paths` et formats sélectionnés sont conservés
- les schémas `*jsonMergePatch*` ne génèrent pas de modèle dédié (`PATCH` est typé `Partial<T>`)
