# Configuration

Toute la configuration passe par `provideBridge()`. Seul `baseUrl` est obligatoire.

```ts
provideBridge({
  baseUrl: '/',                                    // API (relative = même origine que la page)
  http: {withCredentials: false},                  // cookies sur les requêtes cross-origin
  auth: {type: 'bearer', getToken: () => token()}, // optionnel : en-tête Authorization
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

## Choisir sa topologie

### Recommandée : une seule origine

Le front, l'API et le hub sont servis par le même domaine, par exemple derrière Caddy ou FrankenPHP :

```text
https://app.example.com/                       → front Angular
https://app.example.com/api/…                  → API Platform
https://app.example.com/.well-known/mercure    → hub Mercure
```

```ts
provideBridge({
  baseUrl: '/',
  mercure: {hubUrl: '/.well-known/mercure', authorize: '/api/mercure/authorization'},
});
```

Pourquoi :

- les cookies de session et de Mercure sont envoyés sans `withCredentials` ni CORS ;
- la protection XSRF native d'Angular fonctionne (voir plus bas) ;
- le cookie Mercure est simple à poser : même domaine, chemin `/.well-known/mercure`.

### API sur un autre domaine, authentification par token

Le front est sur `https://app.example.com`, l'API sur `https://api.example.com` :

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

- Le token n'est ajouté qu'aux requêtes vers `baseUrl`, jamais aux autres domaines. `getToken` peut renvoyer une promesse (rafraîchissement du token).
- Côté API : CORS avec l'origine exacte du front, l'en-tête `Authorization` et `Access-Control-Allow-Credentials: true`.
- Côté Mercure : `EventSource` ne peut pas envoyer d'en-tête `Authorization`, l'abonnement passe donc par un cookie. Une réponse cross-origin ne dépose un cookie que si la requête est partie avec les credentials, d'où `http.withCredentials`. Le front et l'API doivent partager le même domaine enregistrable (`*.example.com`) pour que le cookie `SameSite` soit envoyé au hub. Le hub doit lister l'origine exacte du front dans `cors_origins` (pas `*`).

> `getToken` est appelé dans le contexte d'injection de la requête : `inject()` y est autorisé.

### Configuration à l'exécution

Pour déployer la même image dans plusieurs environnements, chargez les URL avant le démarrage d'Angular :

```ts
// main.ts
const config = await fetch('/assets/config.json').then((response) => response.json());

await bootstrapApplication(AppComponent, {
  providers: [
    provideBridge({baseUrl: config.apiBaseUrl, mercure: {hubUrl: config.mercureHubUrl}}),
  ],
});
```

## Cookies et sécurité

| Cookie | Posé par | Attributs recommandés | Rôle |
|---|---|---|---|
| session (ex. `PHPSESSID`) | Symfony | `HttpOnly`, `Secure`, `SameSite=Lax` | authentifie les appels API |
| `XSRF-TOKEN` | backend | `Secure`, `SameSite=Lax`, **lisible par JavaScript** | protection CSRF |
| `__Secure-mercure_access_token` | endpoint `authorize` | `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/.well-known/mercure`, durée courte (≈ 10 min) | abonnement Mercure |

**`http.withCredentials`.** Les cookies de même origine sont toujours envoyés. Activez cette option uniquement si l'API est sur une autre origine et s'authentifie par cookie (avec CORS `Access-Control-Allow-Credentials`).

**XSRF.** Le bridge laisse actif l'intercepteur XSRF d'Angular. Sur les requêtes qui modifient des données, il recopie le cookie `XSRF-TOKEN` dans l'en-tête `X-XSRF-TOKEN`, que le backend doit vérifier. Il ne le fait que pour la même origine : sur Angular 20, seulement pour les URL **relatives**, donc avec `baseUrl: '/'` ; à partir d'Angular 21, aussi pour les URL absolues de même origine. Les noms `XSRF-TOKEN` / `X-XSRF-TOKEN` sont ceux d'Angular par défaut.

**Cookie Mercure.**

- Gardez une durée courte. Avec `mercure.authorize`, le bridge le renouvelle quand le hub refuse une reconnexion, sans minuteur côté application.
- `__Secure-` impose HTTPS. En développement HTTP, utilisez `mercure_access_token` et déclarez `cookie_name mercure_access_token` sur le hub. symfony/mercure-bundle choisit ce nom lorsque `kernel.debug` est actif.
- Ne mettez jamais de token dans l'URL (le paramètre `authorization` n'existe plus en Mercure 1.0), et ne lisez jamais ce cookie en JavaScript.

**Intercepteurs.**

- `auth` et les comportements du bridge ne s'appliquent qu'aux requêtes vers `baseUrl`.
- Un intercepteur global, par exemple une redirection vers le login sur 401, se déclare dans `extraInterceptors`. Il doit ignorer l'endpoint `authorize`, que le bridge appelle aussi quand l'utilisateur n'est pas connecté.

## Environnement de développement

```ts
provideBridge({
  baseUrl: '/',
  mercure: {hubUrl: '/.well-known/mercure', authorize: '/api/mercure/authorization'},
  debug: true,          // requêtes, réponses, connexions et refus Mercure dans la console
});
```

Le hub de développement doit déclarer `cookie_name mercure_access_token` (voir [Backend](backend.md#hub-mercure)).
