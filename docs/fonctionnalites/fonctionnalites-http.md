# Fonctionnalités HTTP (API Platform / Hydra)

Le bridge fournit une base HTTP qui colle aux conventions courantes d’API Platform, tout en restant extensible.
L’objectif est de réduire le “boilerplate” dans les apps Angular, et de rendre les requêtes plus cohérentes (headers, credentials, timeouts, retries).

## Headers et formats (API Platform)

Le template embarque un interceptor `Content-Type` orienté JSON-LD/Hydra :

- `Accept: application/ld+json` si absent
- `Content-Type` :
  - `POST` / `PUT` → `application/ld+json`
  - `PATCH` → `application/merge-patch+json`

Cela évite d’avoir à répéter ces headers dans chaque appel.

Pour surcharger, il suffit de passer `headers` (le bridge ne remplace pas un header déjà présent).

## Defaults réseau (optionnels)

Le bridge peut appliquer des defaults via `provideBridge({ defaults: ... })` :

- headers communs (ajoutés si absents sur la requête)
- timeout réseau (`timeoutMs`)
- retries “safe” (`retries`), appliqués par défaut sur `GET/HEAD/OPTIONS`

Exemple :

```ts
import {provideBridge} from '@acme/backend-bridge';

provideBridge({
  baseUrl: 'https://api.example.com',
  defaults: {
    headers: {'X-Requested-With': 'fetch'},
    timeoutMs: 15_000,
    retries: {count: 2, delayMs: 250, methods: ['GET']},
  },
});
```

## Repository et facades

Le runtime expose des abstractions simples :

- un repository REST pour les opérations CRUD et les requêtes génériques
- une factory de facades pour instancier une façade par ressource (`/api/conversations`, etc.)

But : un point d’entrée cohérent (list/get/create/update/delete + request) plutôt que des appels HTTP dispersés.

## Queries Hydra (collection)

`ResourceFacade<T>.getCollection$()` accepte un objet “query” simple :

```ts
this.books.getCollection$({
  page: 1,
  itemsPerPage: 20,
  filters: {
    title: 'Dune',
    published: true,
  },
});
```

Le bridge convertit cette structure en paramètres de query string.

## Escape hatch : `request$`

Quand vous devez appeler un endpoint non standard (controllers custom, uploads, etc.), utilisez `request$` :

```ts
this.books.request$<{ok: boolean}>({
  method: 'POST',
  url: '/api/books/reindex',
  responseType: 'json',
});
```

Vous pouvez aussi changer ponctuellement `withCredentials` ou passer des `headers` spécifiques.

## Concurrence (single-flight HTTP)

Par défaut, le bridge déduplique les requêtes HTTP identiques **tant qu’elles sont en cours** :
- `GET` / `HEAD` / `OPTIONS` : un seul appel réseau “in-flight” pour une même requête ; les abonnés suivants reçoivent la même réponse ;
- pas de déduplication pour les méthodes avec body (`POST`/`PUT`/`PATCH`/`DELETE`).

Objectif : éviter les rafales de requêtes identiques (ex: un écran qui se re-render et relance le même `GET` avant que le précédent ne revienne).

Note : ce n’est pas un cache. Une fois la requête terminée, un nouvel appel identique redéclenche un nouvel appel réseau.

Pour désactiver :

```ts
provideBridge({baseUrl: 'https://api.example.com', singleFlight: false});
```
