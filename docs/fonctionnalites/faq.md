# FAQ / limites

## Pourquoi un package “bridge” par backend ?

Cela évite de mélanger plusieurs contrats API dans un même package.
Chaque backend garde sa spec, ses models, ses conventions, et ses releases.

## Est-ce que Mercure est obligatoire ?

Non. Sans `hubUrl`, le realtime est simplement désactivé.
Le bridge reste utilisable pour HTTP.

## Comment savoir “comment utiliser” un bridge ?

Chaque bridge généré embarque un `README.md` dans le package npm (visible sur votre registry et dans `node_modules/<package>/README.md`).
Ce README décrit la configuration (`provideBridge`) et les APIs (`FacadeFactory`, `ResourceFacade`, `BridgeFacade`).

## Pourquoi `ng-packagr` est nécessaire ?

Le bridge généré est une **lib Angular** construite avec `ng-packagr`.
Meridiane est standalone et installe le toolchain dans `dist/.meridiane-workspace` si nécessaire.

## Comment activer les logs ?

Le CLI : `meridiane --debug ...`.  
Le runtime Angular : `provideBridge({ debug: true })`.

## Comment gérer l’auth ?

Le bridge supporte un Bearer token simple (`auth: 'token'`) ou une résolution lazy (`auth: { type: 'bearer', getToken }`).
Pour un besoin avancé (refresh, multi-sources), passez un `HttpInterceptorFn` custom dans `auth`.

## Comment gérer les cookies / sessions (`withCredentials`) ?

La valeur “par défaut” est déduite de `mercure.init.credentials` :
- `include` envoie des cookies (HTTP + SSE)
- `omit` n’envoie pas de cookies

Vous pouvez aussi surcharger ponctuellement sur les appels HTTP via `opts.withCredentials`.

## Le bridge supporte-t-il SSR ?

Le code SSE est protégé par un check navigateur (pas d’EventSource côté serveur).
Cela dit, le support SSR dépend aussi de votre app et de votre stratégie de data fetching.

## Quelles sont les limites connues de génération de models ?

Meridiane génère les models à partir des endpoints réellement exposés (`paths`) pour les formats demandés.
Les schémas non atteignables depuis `paths` peuvent ne pas être générés (c’est volontaire).
