# Fonctionnalités Mercure / SSE

Cette page fait partie des docs de fonctionnalités.

Le bridge propose une intégration Mercure/SSE conçue pour les apps Angular :
une seule connexion EventSource, une gestion de topics robuste, et une API simple côté facade.

## Mono-connexion et gestion des topics

Le bridge maintient une seule connexion SSE et un registre de topics.
Chaque abonnement incrémente un compteur et chaque désabonnement le décrémente.
Le topic n’est réellement retiré que lorsque le compteur retombe à zéro, ce qui permet plusieurs consommateurs sans conflit.

Quand la liste de topics change (ajout/retrait), la connexion est reconstruite : l’EventSource en cours est fermée puis rouverte avec l’URL mise à jour.

## Dernier event et reprise

Quand Mercure fournit `lastEventId`, le bridge le mémorise et le réutilise lors d’une reconnexion via le paramètre `lastEventID`.
L’objectif est de limiter les “trous” lors des reconnections.

## Activation optionnelle

Mercure est optionnel.
Sans `hubUrl`, le bridge désactive simplement la partie realtime, sans impacter les appels HTTP.

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

Le bridge peut ouvrir l’EventSource avec `withCredentials` lorsque `mercure.init.credentials = 'include'` (ou `withCredentials: true`).
Cela facilite les setups Mercure basés sur cookies/session.
