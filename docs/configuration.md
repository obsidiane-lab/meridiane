# Configuration Angular

Toute la configuration du bridge passe par `provideBridge()`. Le backend correspondant est décrit dans [Backend](backend.md).

## Configuration de référence

Le front, l'API et le hub sont servis sur la même origine par FrankenPHP :

```ts
// src/app/app.config.ts
import {ApplicationConfig, isDevMode} from '@angular/core';
import {provideRouter} from '@angular/router';
import {provideBridge} from '@app/bridge';
import {routes} from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideBridge({
      baseUrl: '/',
      mercure: {
        hubUrl: '/.well-known/mercure',
        authorize: '/api/mercure/authorization',
      },
      debug: isDevMode(),   // requêtes, connexions et refus Mercure dans la console
    }),
  ],
};
```

- `baseUrl: '/'` : l'API est sur l'origine de la page.
- `mercure.hubUrl` active le temps réel.
- `mercure.authorize` est l'endpoint qui pose le cookie d'abonnement ([Backend](backend.md#autoriser-les-abonnés)). Le bridge l'appelle avant la première connexion, puis le renouvelle seul.
- `provideBridge()` installe aussi `HttpClient` : n'ajoutez pas `provideHttpClient()`.

Sur une seule origine, les cookies de session et de Mercure partent sans `withCredentials` ni CORS, et la protection XSRF native d'Angular fonctionne.

## Déclarer le bridge

`meridiane generate` écrit les sources du bridge dans le projet ([Démarrage](demarrage.md#2-générer-le-bridge)). L'application les compile grâce à un alias dans `tsconfig.json` :

```json
{
  "compilerOptions": {
    "paths": {
      "@app/bridge": ["./bridge/src/public-api"]
    }
  }
}
```

## Serveur de développement

`ng serve` tourne dans le service `front` de Docker Compose, derrière FrankenPHP ([Backend](backend.md#composeoverrideyaml-développement)) :

```text
navigateur → https://localhost → FrankenPHP ─┬─ /api/…, /.well-known/mercure → Symfony, hub
                                             └─ le reste → ng serve (front:4200)
```

- Ouvrez l'application sur `https://localhost`, jamais sur le port 4200 : la page doit avoir la même origine que l'API et le hub.
- Le rechargement à chaud fonctionne à travers FrankenPHP.
- La configuration Angular est la même en développement et en production : seul `debug` change, avec `isDevMode()`.

## Configuration à l'exécution

Pour déployer la même image dans plusieurs environnements, chargez les URL avant le démarrage d'Angular :

```ts
// src/main.ts
const config = await fetch('/config.json').then((response) => response.json());

await bootstrapApplication(App, {
  providers: [
    provideBridge({baseUrl: config.apiBaseUrl, mercure: {hubUrl: config.mercureHubUrl, authorize: '/api/mercure/authorization'}}),
  ],
});
```

Sur une seule origine, ce n'est pas nécessaire : les URL relatives conviennent à tous les environnements.

## Authentification

| Backend | Configuration du bridge |
|---|---|
| Session Symfony (cookie), même origine | rien : le cookie de session part avec chaque requête |
| Token (JWT, OIDC) | `auth: {type: 'bearer', getToken: () => inject(AuthStore).accessToken()}` |
| Autre schéma | `auth: monIntercepteur` (`HttpInterceptorFn`) |

- `auth` ne s'applique qu'aux requêtes vers `baseUrl` : le token ne part jamais vers un autre domaine.
- `getToken` est appelé dans le contexte d'injection de la requête, où `inject()` est autorisé. Il peut renvoyer une promesse, par exemple pendant un rafraîchissement du token.
- Le hub n'accepte pas d'en-tête `Authorization`, car `EventSource` ne sait pas en envoyer : l'abonnement Mercure passe toujours par le cookie de l'endpoint `authorize`.
- Après un login ou un logout sans rechargement de page, appelez `BridgeFacade.reconnectRealtime()` ([Temps réel](temps-reel.md#authentification-et-expiration)).

## Cookies et sécurité

| Cookie | Posé par | Attributs | Rôle |
|---|---|---|---|
| session (ex. `PHPSESSID`) | Symfony | `HttpOnly`, `Secure`, `SameSite=Lax` | authentifie les appels API |
| `XSRF-TOKEN` | backend, s'il protège par cookie CSRF | `Secure`, `SameSite=Lax`, **lisible par JavaScript** | protection CSRF |
| `__Secure-mercure_access_token` | endpoint `authorize` | `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/.well-known/mercure`, durée courte | abonnement Mercure |

**XSRF.** Le bridge laisse actif l'intercepteur XSRF d'Angular. Sur les requêtes qui modifient des données, celui-ci recopie le cookie `XSRF-TOKEN` dans l'en-tête `X-XSRF-TOKEN`, que le backend vérifie. Il ne le fait qu'en même origine : sur Angular 20, seulement pour les URL **relatives**, donc avec `baseUrl: '/'` ; à partir d'Angular 21, aussi pour les URL absolues de même origine.

**Cookie Mercure.**

- Gardez une durée courte (≈ 10 minutes). Le bridge le renouvelle 5 secondes avant son expiration si l'endpoint renvoie `expiresIn`, sinon quand le hub refuse une reconnexion.
- En développement, le bundle le nomme `mercure_access_token` et le hub doit déclarer `cookie_name mercure_access_token` ([Backend](backend.md#composeoverrideyaml-développement)).
- Ne lisez jamais ce cookie en JavaScript, et ne mettez jamais de token dans l'URL : le paramètre `authorization` n'existe plus en Mercure 1.0.

**Intercepteurs.** Un intercepteur global, par exemple une redirection vers le login sur une 401, se déclare dans `extraInterceptors`. Il doit ignorer l'endpoint `authorize`, que le bridge appelle aussi quand l'utilisateur n'est pas connecté.

## Toutes les options

```ts
provideBridge({
  baseUrl: '/',                                    // API (relative = même origine que la page)
  http: {withCredentials: false},                  // cookies sur les requêtes cross-origin
  auth: {type: 'bearer', getToken: () => token()}, // en-tête Authorization
  mercure: {
    hubUrl: '/.well-known/mercure',                // active le temps réel
    authorize: '/api/mercure/authorization',       // endpoint qui pose le cookie Mercure
    withCredentials: true,                         // cookies envoyés au hub (défaut)
    maxUrlLength: 4000,                            // au-delà, une autre connexion est ouverte
  },
  defaults: {
    headers: {'Accept-Language': 'fr'},
    timeoutMs: 15_000,
    retries: {count: 2, delayMs: 300},             // GET/HEAD/OPTIONS, erreurs réseau, 429 et 5xx
  },
  singleFlight: true,                              // fusionne les GET identiques simultanés (défaut)
  debug: false,                                    // journalise requêtes et connexions Mercure
  extraInterceptors: [unauthorizedInterceptor],    // vos intercepteurs, appliqués à toutes les requêtes
});
```

Détail de chaque option : [Référence](reference.md#providebridge).

## API sur un autre domaine

À éviter si vous le pouvez : le front sur `https://app.example.com`, l'API et le hub sur `https://api.example.com`.

```ts
provideBridge({
  baseUrl: 'https://api.example.com',
  auth: {type: 'bearer', getToken: () => inject(AuthStore).accessToken()},
  http: {withCredentials: true},                     // pour enregistrer le cookie Mercure renvoyé par authorize
  mercure: {
    hubUrl: '/.well-known/mercure',                  // résolu contre baseUrl → https://api.example.com/.well-known/mercure
    authorize: '/api/mercure/authorization',
  },
});
```

- **API** : CORS avec l'origine exacte du front, l'en-tête `Authorization` et `Access-Control-Allow-Credentials: true`.
- **Cookie Mercure** : une réponse cross-origin ne dépose un cookie que si la requête est partie avec les credentials, d'où `http.withCredentials`. Le front et l'API doivent partager le même domaine enregistrable (`*.example.com`) et le même schéma, sinon le navigateur n'envoie pas le cookie `SameSite` au hub.
- **Hub** : `cors_origins` doit lister l'origine exacte du front (pas `*`).
