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
  mercure: {hubUrl: 'https://api.example.com/.well-known/mercure'},
});
```

Sans `mercure`, le realtime est désactivé. Un `hubUrl` relatif est résolu par rapport à `baseUrl`.

## Écouter une ressource

`ResourceFacade<T>.watch$(iri?: IriRequired)` retourne un
`Observable<T | ResourceDeletion>` et émet directement le JSON reçu : la ressource
pour une création ou modification, ou le payload de suppression d'API Platform.
`ResourceDeletion` est un type exporté qui conserve les métadonnées d'un `Item` :

```ts
interface ResourceDeletion extends Item {
  '@id': string;
}
```

Le helper exporté `isResourceDeletion(payload: Item): payload is ResourceDeletion`
reconnaît un payload réduit à `@id`, éventuellement accompagné de `@type` et
`@context`. Le repository applique les ressources au store de l'application :

```ts
import {inject, Injectable} from '@angular/core';
import {Observable, tap} from 'rxjs';
import {Book, FacadeFactory, IriRequired, isResourceDeletion, ResourceDeletion} from '@acme/backend-bridge';
import {BookStore} from './book.store';

@Injectable({providedIn: 'root'})
export class BookRepository {
  private readonly store = inject(BookStore);
  private readonly books = inject(FacadeFactory).create<Book>({url: '/api/books'});

  watch$(iri?: IriRequired): Observable<Book | ResourceDeletion> {
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

[API Platform](https://api-platform.com/docs/core/mercure/#pushing-the-api-updates) publie une suppression avec un payload réduit à `{"@id": ...}`. Le bridge le transmet tel quel, en conservant aussi les éventuels `@type` et `@context`. Le repository utilise `isResourceDeletion(resource)` puis retire `resource['@id']` du store ; les signaux propagent la suppression aux composants.

## Une seule connexion

Toute l'application partage **une** connexion SSE, dont les abonnements sont l'union
des `watch$()` actifs : patterns de ressources et IRI exactes.

Quand cet ensemble change, le bridge rouvre la connexion avec `last_event_id`
lorsqu'un identifiant a déjà été reçu. Les changements d'abonnements faits dans la
même tâche sont regroupés. La reprise dépend de l'historique conservé par le hub et
de la disponibilité du curseur : elle ne garantit pas l'absence de perte. Avant le
premier événement, aucun curseur n'est disponible ; la synchronisation du chargement
HTTP initial avec le flux et les éventuelles resynchronisations restent à organiser
dans l'application.

Mercure n'indique pas quel abonnement a sélectionné un événement : chaque façade
garde les événements dont l'`@id` correspond à son pattern ou à l'IRI demandée.

## Authentification

Le bridge utilise l'`EventSource` natif. Un navigateur ne pouvant pas y ajouter d'en-tête `Authorization`, Mercure 1.0 prévoit un **cookie** : `__Secure-mercure_access_token` (HttpOnly). Le token n'est jamais accessible au JavaScript.

- Le backend pose le cookie (avec symfony/mercure-bundle : `Authorization::setCookie()`, ou la fonction Twig `mercure()` avec l'option `subscribe`).
- Le bridge envoie les cookies au hub (`mercure.withCredentials`, `true` par défaut).
- Le hub doit autoriser l'origine de l'application (`cors_origins`).
- Le préfixe `__Secure-` impose HTTPS. En développement sur HTTP, configurez le hub avec `cookie_name mercure_access_token` (le bundle utilise ce nom quand `kernel.debug` est actif).

Sans cookie, le hub traite l'abonné en anonyme (directive `anonymous`) : il ne reçoit que les updates publiques.

Le paramètre de requête `authorization` a été supprimé en Mercure 1.0. Le bridge ne met jamais de token dans l'URL.

## Erreurs et reconnexion

- Coupure réseau : le navigateur se reconnecte seul et renvoie `Last-Event-ID`.
- Refus du hub (`401 invalid_token`, `403 insufficient_scope`, `400`) : `EventSource` abandonne. Le bridge réessaie avec un délai croissant (1 s à 30 s) et compte les échecs dans les diagnostics.

## État et diagnostics

- `ResourceFacade.connectionStatus` : signal `'closed' | 'connecting' | 'connected'`
- `BridgeFacade.realtimeStatus$()`
- `BridgeFacade.realtimeDiagnostics$()` : statut, URL d'abonnement, abonnements actifs (`match`, `type`, nombre de consommateurs), `lastEventId`, nombre d'échecs consécutifs

## Compatibilité navigateur

L'écoute d'une ressource utilise [`URLPattern`](https://developer.mozilla.org/docs/Web/API/URLPattern) pour router les événements. Si votre navigateur cible ne le fournit pas, chargez un polyfill tel que [`urlpattern-polyfill`](https://www.npmjs.com/package/urlpattern-polyfill) dans l'application.

## SSR

Aucune connexion `EventSource` n'est ouverte côté serveur : `watch$()` y complète immédiatement.

## Hub : configuration attendue (Caddyfile)

```caddyfile
mercure {
	issuer {$MERCURE_TRUSTED_ISSUERS} {
		publisher {
			jwt {env.MERCURE_PUBLISHER_JWT_KEY} {env.MERCURE_PUBLISHER_JWT_ALG}
		}
		subscriber {
			jwt {env.MERCURE_SUBSCRIBER_JWT_KEY} {env.MERCURE_SUBSCRIBER_JWT_ALG}
		}
	}
	anonymous
	cors_origins https://app.example.com
}
```

Côté Symfony (symfony/mercure-bundle ≥ 0.6) : `protocol_version: '1.0'` et les claims `iss` (égal à `MERCURE_TRUSTED_ISSUERS`), `sub` et `client_id` dans `jwt.claims`. Voir `playground/api-platform` pour une configuration complète.

## Migration de Meridiane 2.x vers 3.0

La version de Meridiane et celle du protocole Mercure sont distinctes : cette
migration de Meridiane accompagne le passage du hub de Mercure 0.x à Mercure 1.0.

| Meridiane 2.x | Meridiane 3.0 |
|---|---|
| `resource.watch$(iri \| iri[])` + `unwatch(iri)` | `resource.watch$(iri)` pour un item ou `watch$()` pour la ressource ; un abonnement par IRI pour plusieurs items, libéré avec `unsubscribe()` |
| `resource.watchSubResource$(parentIri, field)` | chargement des IRI liées et abonnements explicites dans le repository de l'application |
| `bridge.watch$()`, `bridge.watchTypes$()`, `bridge.unwatch()` | supprimés : écouter chaque ressource avec `watch$()` |
| `mercure.connectionMode`, `maxUrlLength`, `newConnection` | supprimés (connexion unique) |
| `mercure.topicMode` | supprimé (topics absolus, comme API Platform) |
| `mercure.init: {credentials}` | `mercure.withCredentials` |
| `http.withCredentials` déduit de Mercure | `http.withCredentials`, `false` par défaut |
| `?topic=` / `?lastEventID=` | Mercure 1.0 : `?match=` ou `?match_urlpattern=`, reprise avec `?last_event_id=` |
| modèles de `dev` plus permissifs | mêmes modèles que `generate` et `build`, conformes aux champs requis et à la nullabilité OpenAPI |
