# Mercure / SSE

Meridiane 3.0 implémente le protocole [Mercure 1.0](https://mercure.rocks/spec). Le hub doit parler ce protocole ; un hub Mercure 0.x doit être migré selon le [guide officiel](https://mercure.rocks/docs/UPGRADE).

## Écouter une ressource ou un item

Pour les topics d'item habituels d'API Platform, `watch$()` écoute une **ressource** sous la forme d'un [URL Pattern](https://urlpattern.spec.whatwg.org/) envoyé au hub avec `match_urlpattern` :

```
GET /.well-known/mercure?match_urlpattern=https://api.example.com/api/books/:id
```

Cet abonnement reçoit aussi les créations d'items encore absents du store, sans
dépendre des entités déjà chargées. Pour écouter un item précis, utilisez
`watch$('/api/books/1')` : le bridge résout l'IRI contre `baseUrl` et envoie
`match=https://api.example.com/api/books/1`. Une IRI absolue est également acceptée.
Les événements privés restent soumis aux autorisations configurées sur le hub.

## Activer Mercure

```ts
provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {
    hubUrl: '/.well-known/mercure',
    authorize: '/api/mercure/authorization',
  },
});
```

Sans `mercure`, le realtime est désactivé. Options :

- `hubUrl` : URL du hub. Une URL relative est résolue contre `baseUrl` (résolution d'URL standard : `/.well-known/mercure` vise la racine de l'origine de l'API).
- `withCredentials` : envoie les cookies au hub, `true` par défaut.
- `authorize` : endpoint de l'API appelé en `GET` pour obtenir le cookie d'autorisation Mercure, ou fonction qui s'en charge. Voir [Authentification](#authentification).
- `maxUrlLength` : longueur maximale d'une URL d'abonnement, `4000` par défaut. Voir [Connexions](#connexions).

Un `baseUrl` relatif (ex. `/`) est accepté : les topics Mercure sont absolus, le bridge les résout contre l'URL du document.

## Écouter une ressource

`ResourceFacade<T>.watch$(iri?: Iri)` retourne un
`Observable<T | ResourceDeletion>` et émet directement le JSON reçu : la ressource
pour une création ou modification, ou le payload de suppression d'API Platform.
`ResourceDeletion` est le type exporté du payload qu'API Platform publie à la
suppression : `{"@id": ...}`, plus `@type` quand `api_platform.mercure.include_type`
est activé.

```ts
interface ResourceDeletion {
  '@id': string;
  '@type'?: string | string[];
}
```

Le helper exporté `isResourceDeletion(payload: object): payload is ResourceDeletion`
reconnaît un payload réduit à `@id`, éventuellement accompagné de `@type`. Une
création ou une modification est la ressource sérialisée en JSON-LD et porte toujours
`@context`. Si une ressource définit son propre payload avec l'option Mercure `data`,
le bridge ne peut pas distinguer une suppression. Le repository applique les
ressources au store de l'application :

```ts
import {inject, Injectable} from '@angular/core';
import {Observable, tap} from 'rxjs';
import {Book, FacadeFactory, Iri, isResourceDeletion, ResourceDeletion} from '@acme/backend-bridge';
import {BookStore} from './book.store';

@Injectable({providedIn: 'root'})
export class BookRepository {
  private readonly store = inject(BookStore);
  private readonly books = inject(FacadeFactory).create<Book>({url: '/api/books'});

  watch$(iri?: Iri): Observable<Book | ResourceDeletion> {
    return this.books.watch$(iri).pipe(
      tap((resource) => {
        if (isResourceDeletion(resource)) this.store.remove(resource['@id']);
        else this.store.upsert(resource);
      }),
    );
  }
}
```

Le payload conserve le JSON reçu. Pour remplacer directement la ressource dans le store,
le backend doit publier la même représentation complète que GET. Meridiane n'ajoute
pas de GET et ne reconstruit pas les relations.

Les relations restent des IRI si le backend les expose ainsi. Les services de
l'application chargent les ressources liées manquantes à la demande et composent
les vues depuis les signaux des stores. Le développeur décide des topics et
publications nécessaires pour maintenir la cohérence entre entités, par exemple
entre un message et sa conversation.

L'abonnement dure tant que l'Observable est souscrit. Plusieurs écoutes du même
pattern ou de la même IRI partagent l'abonnement au hub ; `unsubscribe()` libère
chaque consommateur. Le dernier désabonnement retire le sélecteur concerné.

### Topic de la ressource

Par défaut, le topic est `{url}/:id` (ex. `/api/books` → `https://api.example.com/api/books/:id`), ce qui correspond aux IRIs d'item par défaut d'API Platform. Si l'IRI de vos items a une autre forme, passez le pattern explicitement :

```ts
factory.create<Book>({url: '/api/books', topic: '/api/library/books/:isbn'});
```

### Suppressions

[API Platform](https://api-platform.com/docs/core/mercure/#pushing-the-api-updates) publie une suppression avec un payload réduit à `{"@id": ...}`, plus `@type` avec `include_type`. Le bridge le transmet tel quel. Le repository utilise `isResourceDeletion(resource)` puis retire `resource['@id']` du store ; les signaux propagent la suppression aux composants.

## Connexions

Par défaut, toute l'application partage les connexions SSE : les abonnements des
`watch$()` actifs (patterns de ressources et IRI exactes) sont répartis sur le moins
de connexions possible. Une connexion prend des abonnements tant que son URL reste
sous `maxUrlLength` (4000 caractères par défaut, hors `last_event_id`) et sous
100 abonnements, la limite du hub de référence. Au-delà, le bridge ouvre une autre
connexion. Les proxys et CDN refusent souvent les URL de plus de 4 à 8 Ko : baissez
`maxUrlLength` si votre infrastructure est plus stricte.

L'option `connection` choisit la connexion d'un abonnement :

```ts
books.watch$();                                  // 'shared' : connexions partagées (défaut)
books.watch$('/api/books/1', {connection: 'dedicated'}); // connexion propre à cet abonnement
books.watch$(undefined, {connection: 'admin'});  // connexions partagées par les abonnements nommés 'admin'
```

Une connexion dédiée ou nommée isole un flux des reconnexions des autres (ex. un
écran temps réel critique). Les limites de longueur s'appliquent à chaque groupe.

### Abonnement explicite

Pour un topic qui n'est pas l'IRI d'un item (topic alternatif publié avec l'option
`topics` d'API Platform, topic d'un autre service), `BridgeFacade.watch$()` s'abonne
à un sélecteur Mercure et émet le JSON reçu sans filtre sur `@id` :

```ts
const bridge = inject(BridgeFacade);
bridge.watch$<Notification>({match: '/users/42/notifications'}).subscribe(...);
bridge.watch$({match: '/api/orders/:id', type: 'urlpattern'}).subscribe(...);
```

`match` relatif est résolu contre `baseUrl` ; `type` vaut `exact` par défaut. La
connexion est `dedicated` par défaut : tout événement reçu appartient à cet
abonnement. Sur une connexion partagée ou nommée, le flux contient aussi les
événements des autres abonnements de cette connexion.

Mercure ne permet pas de modifier les abonnements d'un flux ouvert : quand les
abonnements d'une connexion changent, seule cette connexion est rouverte, avec
`last_event_id` lorsqu'elle a déjà reçu un événement. Les changements d'abonnements
faits dans la même tâche sont regroupés. La reprise dépend de l'historique conservé
par le hub et de la disponibilité du curseur : elle ne garantit pas l'absence de
perte. Avant le premier événement, aucun curseur n'est disponible ; la
synchronisation du chargement HTTP initial avec le flux et les éventuelles
resynchronisations restent à organiser dans l'application.

Mercure n'indique pas quel abonnement a sélectionné un événement : chaque façade
garde les événements dont l'`@id` correspond à son pattern ou à l'IRI demandée.
API Platform publie le topic d'un item en IRI absolue (`https://api.example.com/api/books/1`)
alors que l'`@id` du payload est relatif (`/api/books/1`) : le bridge résout l'`@id`
contre `baseUrl` avant de le comparer.

Seul l'événement SSE par défaut (`message`) est écouté. Une ressource publiée avec
l'option Mercure `type` d'API Platform envoie un événement nommé, ignoré par le bridge.

## Authentification

Le bridge utilise l'`EventSource` natif. Un navigateur ne pouvant pas y ajouter d'en-tête `Authorization`, Mercure 1.0 prévoit un **cookie** : `__Secure-mercure_access_token` (HttpOnly). Le token n'est jamais accessible au JavaScript.

- Le backend pose le cookie (avec symfony/mercure-bundle : `Authorization::setCookie()`, ou la fonction Twig `mercure()` avec l'option `subscribe`).
- Le bridge envoie les cookies au hub (`mercure.withCredentials`, `true` par défaut).
- Le hub doit autoriser l'origine de l'application (`cors_origins`).
- Le préfixe `__Secure-` impose HTTPS. En développement sur HTTP, configurez le hub avec `cookie_name mercure_access_token` (le bundle utilise ce nom quand `kernel.debug` est actif).
- L'ancien cookie `mercureAuthorization` n'est accepté qu'en mode compatibilité 0.x du hub.

Avec `mercure.authorize`, le bridge obtient le cookie lui-même : il appelle l'endpoint
(ou la fonction) avant la première connexion, puis après chaque connexion refusée par
le hub, avant de la rouvrir. Les appels simultanés sont regroupés. Le hub ferme la
connexion à l'expiration du token et refuse la reconnexion (`401`) : ce mécanisme
renouvelle le cookie sans minuterie côté application.

Sans cookie, le hub n'accepte l'abonné que si la directive `anonymous` est activée ;
l'abonné ne reçoit alors que les updates publiques. Un token invalide ou expiré est
refusé (`401`) même avec `anonymous`.

Le hub n'évalue les droits qu'à l'ouverture d'une connexion. Après un login ou un
logout sans rechargement de page, appelez `BridgeFacade.reconnectRealtime()` : le
bridge renouvelle l'autorisation puis rouvre toutes les connexions.

Le paramètre de requête `authorization` a été supprimé en Mercure 1.0. Le bridge ne met jamais de token dans l'URL.

## Erreurs et reconnexion

- Coupure réseau : le navigateur se reconnecte seul et renvoie `Last-Event-ID`.
- Refus du hub (`401 invalid_token`, `403 insufficient_scope`, `429` limite d'abonnements, `400` requête invalide) : `EventSource` abandonne sans exposer le code. Le bridge renouvelle l'autorisation (`mercure.authorize`), puis rouvre la connexion avec un délai croissant (1 s à 30 s), et compte les échecs dans les diagnostics.
- Un abonnement invalide (ex. URL Pattern mal formé, refusé en `400`) fait échouer la connexion qui le porte, jusqu'à ce qu'il soit libéré.

## État et diagnostics

- `ResourceFacade.connectionStatus` : signal `'closed' | 'connecting' | 'connected'`, partagé par toutes les façades ; `connected` quand toutes les connexions sont ouvertes
- `BridgeFacade.realtimeStatus$()`
- `BridgeFacade.realtimeDiagnostics$()` : statut global et, par connexion, groupe (`shared`, `dedicated` ou nom), statut, URL d'abonnement, abonnements actifs (`match`, `type`, nombre de consommateurs), `lastEventId`, nombre d'échecs consécutifs

## Compatibilité navigateur

L'écoute d'une ressource utilise [`URLPattern`](https://developer.mozilla.org/docs/Web/API/URLPattern) pour router les événements. Si votre navigateur cible ne le fournit pas, chargez un polyfill tel que [`urlpattern-polyfill`](https://www.npmjs.com/package/urlpattern-polyfill) dans l'application.

## SSR

Aucune connexion `EventSource` n'est ouverte côté serveur : `watch$()` y complète immédiatement.

## Backend attendu

### Versions

- Hub Mercure 1.x (module Mercure de Caddy / FrankenPHP).
- symfony/mercure ≥ 0.9 et symfony/mercure-bundle ≥ 0.6 : le protocole 1.0 est leur défaut. Le bundle exige les claims `iss` (un issuer déclaré sur le hub), `sub` et `client_id` dans `jwt.claims`.

### Hub (Caddyfile)

```caddyfile
mercure {
	issuer {$MERCURE_JWT_ISSUER} {
		publisher {
			jwt {env.MERCURE_JWT_KEY} HS256
		}
		subscriber {
			jwt {env.MERCURE_JWT_KEY} HS256
		}
	}
	cors_origins https://app.example.com
}
```

- symfony/mercure-bundle signe les publications **et** le cookie abonné avec la clé du hub (`jwt.secret`) : l'issuer doit vérifier les deux avec cette même clé.
- `anonymous` seulement si des updates publiques doivent être reçues sans cookie.
- En développement sur HTTP : `cookie_name mercure_access_token` (le préfixe `__Secure-` exige HTTPS).

Voir `playground/@obsidiane/caddy/Caddyfile` et `playground/core/config/packages/mercure.yaml`.

### Endpoint d'autorisation

L'endpoint passé à `mercure.authorize` pose le cookie avec `Authorization::createCookie()`.
Le JWT porte `authorization_details` (les claims `mercure.subscribe` / `mercure.publish`
ne sont acceptés qu'en mode compatibilité 0.x du hub). Restreignez le grant aux droits de
l'utilisateur : le hub ne livre une update privée qu'aux tokens dont un grant couvre son
topic, et les matchers d'abonnement n'élargissent jamais les droits.

```php
#[Route('/api/mercure/authorization', methods: ['GET'])]
public function __invoke(Request $request): Response
{
    $grant = new Grant([Grant::ACTION_SUBSCRIBE], [
        'urlpattern' => ['https://api.example.com/api/books/:id'],
    ]);

    $response = new Response(null, Response::HTTP_NO_CONTENT, ['Cache-Control' => 'no-store, private']);
    $response->headers->setCookie($this->authorization->createCookie(
        $request, [$grant], null, ['exp' => new \DateTimeImmutable('+600 seconds')],
    ));

    return $response;
}
```

Exemple complet : `playground/core/src/Controller/MercureAuthorizationController.php`.

### Publication API Platform

- Aucun topic de collection n'est nécessaire : `watch$()` écoute la ressource par URL Pattern sur les topics d'item publiés par défaut.
- API Platform publie le topic d'un item en IRI absolue construite par le routeur Symfony. Pour les publications faites hors requête HTTP (commande console, worker Messenger), configurez `framework.router.default_uri` afin que l'hôte corresponde à `baseUrl`.

## Migration de Meridiane 2.x vers 3.0

La version de Meridiane et celle du protocole Mercure sont distinctes : cette
migration de Meridiane accompagne le passage du hub de Mercure 0.x à Mercure 1.0.

| Meridiane 2.x | Meridiane 3.0 |
|---|---|
| `resource.watch$(iri \| iri[])` + `unwatch(iri)` | `resource.watch$(iri)` pour un item ou `watch$()` pour la ressource ; un abonnement par IRI pour plusieurs items, libéré avec `unsubscribe()` |
| `resource.watchSubResource$(parentIri, field)` | chargement des IRI liées et abonnements explicites dans le repository de l'application |
| `bridge.watch$(iris)`, `bridge.watchTypes$()`, `bridge.unwatch()` | `resource.watch$()` par ressource ; `bridge.watch$({match, type?})` pour un sélecteur explicite, sur connexion dédiée et sans filtre |
| `mercure.connectionMode: 'single'`, `{newConnection: true}` | `{connection: 'dedicated'}` sur `watch$()`, ou un nom de connexion partagée |
| `IriRequired`, `Iri = string \| undefined` | `Iri = string` |
| `FacadeConfig.repo`, `ApiPlatformRestRepository` | supprimés : `ResourceFacade<T>` s'appuie sur `BridgeFacade` |
| `HttpRequestConfig.options` | supprimé : `headers`, `query`, `body`, `responseType`, `withCredentials` |
| `joinUrl`, `resolveUrl` exportés | internes au bridge |
| `mercure.maxUrlLength` (1900 par défaut) | `mercure.maxUrlLength` (4000 par défaut), plus 100 abonnements maximum par connexion |
| cookie Mercure obtenu par l'application | `mercure.authorize` : le bridge obtient et renouvelle le cookie |
| `mercure.topicMode` | supprimé (topics absolus, comme API Platform) |
| `mercure.init: {credentials}` | `mercure.withCredentials` |
| `http.withCredentials` déduit de Mercure | `http.withCredentials`, `false` par défaut |
| `?topic=` / `?lastEventID=` | Mercure 1.0 : `?match=` ou `?match_urlpattern=`, reprise avec `?last_event_id=` |
| modèles de `dev` plus permissifs | mêmes modèles que `generate` et `build`, conformes aux champs requis et à la nullabilité OpenAPI |
