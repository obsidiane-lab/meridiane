# HTTP / Hydra

Le runtime applique des conventions API Platform tout en restant flexible.

## Headers par défaut

- `Accept: application/ld+json` si absent
- `Content-Type` :
  - `POST` / `PUT` → `application/ld+json`
  - `PATCH` → `application/merge-patch+json`

Si un header est déjà défini, le bridge ne le remplace pas.

## Defaults réseau (optionnels)

`provideBridge({ defaults: ... })` permet d’appliquer :

- headers communs (ajoutés si absents)
- timeout (`timeoutMs`)
- retries “safe” (`retries`) sur `GET/HEAD/OPTIONS`

Exemple :

```ts
provideBridge({
  baseUrl: 'https://api.example.com',
  defaults: {
    headers: {'X-Requested-With': 'fetch'},
    timeoutMs: 15_000,
    retries: {count: 2, delayMs: 250, methods: ['GET']},
  },
});
```

`retries` peut être :
- un nombre (`2`), ou
- un objet `{count, delayMs?, methods?}`

## Queries Hydra (collection)

`ResourceFacade<T>.getCollection$()` accepte un objet de query simple :

```ts
this.books.getCollection$({
  page: 1,
  itemsPerPage: 20,
  filters: {title: 'Dune', published: true},
});
```

## Escape hatch : `request$`

Pour un endpoint non standard (controllers custom, uploads, etc.) :

```ts
this.books.request$<{ok: boolean}>({
  method: 'POST',
  url: '/api/books/reindex',
  responseType: 'json',
});
```

Vous pouvez aussi fournir `headers`, `withCredentials`, ou `options` (pass-through Angular).

## Concurrence (single-flight HTTP)

Par défaut, le bridge déduplique les requêtes identiques **tant qu’elles sont en cours** :
- `GET` / `HEAD` / `OPTIONS` partagent un seul appel réseau
- pas de déduplication pour les méthodes avec body

Ce mécanisme n’est **pas** un cache.

Désactiver :

```ts
provideBridge({baseUrl: 'https://api.example.com', singleFlight: false});
```
