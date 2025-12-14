# Fonctionnalités Mercure / SSE

Le bridge propose une intégration Mercure/SSE conçue pour les apps Angular :
une seule connexion EventSource, une gestion de topics robuste, et une API simple côté facade.

## Activer Mercure

Mercure est optionnel : si `hubUrl` n’est pas configuré, le realtime est désactivé (les appels HTTP continuent de fonctionner).

```ts
import {provideBridge} from '@acme/backend-bridge';

provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {hubUrl: 'https://api.example.com/.well-known/mercure'},
});
```

## Mono-connexion et gestion des topics

Le bridge maintient une seule connexion SSE et un registre de topics.
Chaque abonnement incrémente un compteur et chaque désabonnement le décrémente.
Le topic n’est réellement retiré que lorsque le compteur retombe à zéro, ce qui permet plusieurs consommateurs sans conflit.

Quand la liste de topics change (ajout/retrait), la connexion est reconstruite : l’EventSource en cours est fermée puis rouverte avec l’URL mise à jour.

## Concurrence (important)

Le runtime garantit qu’il n’y a **qu’une seule requête SSE active à la fois** (une seule `EventSource` ouverte par hub).

Conséquences :
- plusieurs appels à `watch$()` sur la même ressource ne déclenchent pas plusieurs connexions : ils partagent la même connexion SSE ;
- demander plusieurs fois le même topic ne le duplique pas dans l’URL du hub (`topic=`) : il est dédoublonné et géré par ref-count ;
- les reconstructions de connexion sont sérialisées (pas de “double reconnexion” en parallèle) : si plusieurs subscribe/unsubscribe arrivent en rafale, la connexion est reconstruite une seule fois avec la liste de topics à jour.

Note : cette règle concerne la **connexion SSE**. Les appels HTTP restent concurrents, avec une déduplication “in-flight” (single-flight) pour les requêtes identiques `GET/HEAD/OPTIONS`.

## Dernier event et reprise

Quand Mercure fournit `lastEventId`, le bridge le mémorise et le réutilise lors d’une reconnexion via le paramètre `lastEventID`.
L’objectif est de limiter les “trous” lors des reconnections.

## Canonicalisation des topics (éviter les doublons)

En dev, il arrive qu’un même identifiant circule sous deux formes :

- IRI relative : `/api/conversations/1`
- URL absolue : `http://localhost:8000/api/conversations/1`

Le bridge canonise les topics pour éviter :

- `topic=` en double dans l’URL du hub
- un `unwatch` qui ne décrémente qu’une des deux formes

Cette canonicalisation est interne, et configurable via `provideBridge({ mercure: { topicMode } })`.

## `topicMode` (`url` vs `iri`)

`topicMode` contrôle la forme envoyée au hub dans les paramètres `topic=` :

- `url` (défaut) : topics absolus (recommandé, correspond aux topics ABS_URL côté backend)
- `iri` : topics relatifs same-origin (utile si votre backend publie des topics en ABS_PATH)

## Filtrer des événements (sous-ressources)

Le bridge permet de s’abonner à un topic parent et de filtrer côté client sur un champ relationnel.
C’est pratique quand une sous-ressource doit “remonter” sur le topic d’un parent (ex: `Message` sur le topic d’une `Conversation`).

Exigence côté payload : le champ relationnel filtré doit être une IRI (string) ou une liste d’IRIs (string[]).
Le pattern recommandé est “API Platform relations = IRIs”, puis reconstruction côté frontend via stores.

## Credentials et cookies

Le bridge peut envoyer des cookies (sessions) côté SSE (EventSource) et côté HTTP.

Le comportement `withCredentials` par défaut est déduit de `mercure.init` :
- `credentials: 'include'` (défaut) → cookies envoyés
- `credentials: 'omit'` → cookies non envoyés

```ts
import {provideBridge} from '@acme/backend-bridge';

provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {
    hubUrl: 'https://api.example.com/.well-known/mercure',
    init: {credentials: 'include'},
  },
});
```

## SSR / navigateur

Le bridge n’ouvre jamais d’EventSource côté serveur : la connexion SSE est activée uniquement dans le navigateur.
