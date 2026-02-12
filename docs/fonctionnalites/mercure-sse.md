# Mercure / SSE

Le bridge intègre Mercure avec gestion des subscriptions, mutualisation des connexions et diagnostics runtime.

## Activer Mercure

```ts
provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {hubUrl: 'https://api.example.com/.well-known/mercure'},
});
```

Sans `hubUrl`, le realtime est désactivé.

## Topic mode

`topicMode` contrôle la forme envoyée au hub :

- `url` (défaut) : topics absolus
- `iri` : topics relatifs same-origin

## Modes de connexion

`mercure.connectionMode` :

- `auto` (défaut)
  - mutualise les subscriptions sur des connexions partagées
  - découpe automatiquement en plusieurs connexions si l'URL Mercure dépasse `mercure.maxUrlLength` (défaut `1900`)
- `single`
  - ouvre une connexion dédiée par abonnement

Override ponctuel :

```ts
resource.watch$(iri, {newConnection: true});
bridge.watchTypes$(topic, ['Message'], {discriminator: '@type'}, {newConnection: true});
```

## APIs realtime

- `ResourceFacade.watch$(iri|iri[], {newConnection?})`
- `ResourceFacade.watchSubResource$(iri|iri[], field, {newConnection?})`
- `BridgeFacade.watch$(iri|iri[], filter?, {newConnection?})`
- `BridgeFacade.watchTypes$(iri|iri[], resourceTypes, cfg?, {newConnection?})`
- `BridgeFacade.realtimeDiagnostics$()`

## `watchSubResource$`

Permet de recevoir des événements d'une sous-ressource publiés sur un topic parent.

```ts
resource.watchSubResource$<Message>('/api/conversations/1', 'conversation');
```

Le champ filtré peut être une IRI (`string`) ou une liste d'IRIs (`string[]`).

## `watchTypes$` (topic multi-entités)

Usage :

```ts
bridge.watchTypes$<Registry>(
  '/api/events/me',
  ['Conversation', 'Message'],
  {discriminator: '@type'}
);
```

Sortie : événements `{ resourceType, payload }`.

Important :
- le filtrage est fait sur le payload (`@type` par défaut), pas sur la provenance réseau stricte du topic
- en mode mutualisé, un événement d'un autre topic partagé peut passer s'il matche le type demandé

Pour isolation stricte d'un topic :
- `newConnection: true` sur l'appel, ou
- `connectionMode: 'single'` global.

## Diagnostics runtime

`BridgeFacade.realtimeDiagnostics$()` expose :

- mode courant (`auto`/`single`)
- nombre total de connexions
- répartition `shared` / `dedicated`
- liste détaillée des connexions (status, topics, longueur d'URL)

## Cookies / credentials

Le `withCredentials` par défaut est déduit de `mercure.init` :

- `credentials: 'include'` (défaut) : cookies envoyés
- `credentials: 'omit'` : cookies non envoyés

Exemple :

```ts
provideBridge({
  baseUrl: 'https://api.example.com',
  mercure: {
    hubUrl: 'https://api.example.com/.well-known/mercure',
    init: {credentials: 'omit'},
  },
});
```

## SSR

Aucune connexion `EventSource` n'est ouverte côté serveur. SSE est actif uniquement dans le navigateur.
