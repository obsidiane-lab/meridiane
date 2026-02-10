# Mercure / SSE

Le bridge propose une intégration Mercure/SSE pensée pour Angular :
une seule connexion EventSource, gestion robuste des topics, API simple côté facades.

## Activer Mercure

```ts
provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {hubUrl: 'https://api.example.com/.well-known/mercure'},
});
```

Sans `hubUrl`, le realtime est désactivé.

## Mode de topics

`topicMode` contrôle la forme envoyée au hub :

- `url` (défaut) : topics absolus
- `iri` : topics relatifs same-origin

## Modèle de connexion

- Une seule connexion SSE est maintenue.
- Les topics sont gérés en ref-count (pas de doublons).
- Les reconnections sont sérialisées.

## Filtrer des événements (sous-ressources)

```ts
resource.watchSubResource$<Message>('/api/conversations/1', 'conversation');
```

Le champ filtré doit être une IRI (string) ou une liste d’IRIs (`string[]`).

## Topics “multi-entités”

Quand un même topic Mercure publie plusieurs types d’entités (Message, Conversation, ...),
utilisez `BridgeFacade.watchTypes$()` pour obtenir un flux typé (union discriminée).

Principe :
- vous vous abonnez à un topic “libre” (ou une liste)
- chaque event recu est discriminé par type (`@type` en JSON-LD)
- seuls les `resourceType` explicitement demandés sont émis (le reste est ignoré)

```ts
import {inject} from '@angular/core';
import {BridgeFacade} from '@acme/backend-bridge';
import type {Item} from '@acme/backend-bridge';

type Conversation = Item & {title?: string | null};
type Message = Item & {conversation?: string | Item | null; originalText?: string | null};

type Registry = {Conversation: Conversation; Message: Message};

const bridge = inject(BridgeFacade);

bridge.watchTypes$<Registry>(
  '/api/events/me',
  ['Conversation', 'Message'],
  {discriminator: '@type'}
);
```

Notes :
- En sortie, chaque event inclut `resourceType` + `payload`.

## Credentials et cookies

Le `withCredentials` par défaut est déduit de `mercure.init.credentials` :
- `include` (défaut) → cookies envoyés
- `omit` → cookies non envoyés

```ts
provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {hubUrl: 'https://api.example.com/.well-known/mercure', init: {credentials: 'include'}},
});
```

## SSR / navigateur

Le bridge n’ouvre jamais d’EventSource côté serveur : la connexion SSE est activée uniquement dans le navigateur.
