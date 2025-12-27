# FAQ

## Pourquoi un bridge par backend ?

Chaque backend garde sa spec, ses models, ses conventions et ses releases.
Cela évite de mélanger plusieurs contrats API dans un seul package.

## Monorepo : faut-il publier sur npm ?

Non. Utilisez `meridiane generate` pour générer les sources dans votre workspace,
puis consommez-les comme une lib locale.

## Est-ce que Mercure est obligatoire ?

Non. Sans `hubUrl`, le realtime est désactivé.
Le bridge reste utilisable pour HTTP.

## Comment activer les logs ?

- CLI : `meridiane --debug ...`
- Runtime Angular : `provideBridge({ debug: true })`

## Comment gérer l’auth ?

Le bridge supporte :
- un Bearer token simple (`auth: 'token'`),
- un Bearer lazy (`auth: { type: 'bearer', getToken }`),
- un `HttpInterceptorFn` custom.

## Comment gérer les cookies / sessions (`withCredentials`) ?

La valeur par défaut est déduite de `mercure.init.credentials` :
- `include` envoie des cookies (HTTP + SSE)
- `omit` n’envoie pas de cookies

Vous pouvez aussi surcharger ponctuellement via `opts.withCredentials`.

## Le bridge supporte-t-il SSR ?

La partie SSE est désactivée côté serveur (pas d’EventSource).
Le support SSR dépend ensuite de votre stratégie de data fetching.

## Quelles sont les limites connues de génération de models ?

Les models sont générés à partir des endpoints réellement exposés (`paths`) pour les formats demandés.
Les schémas non atteignables depuis `paths` peuvent ne pas être générés (comportement volontaire).
