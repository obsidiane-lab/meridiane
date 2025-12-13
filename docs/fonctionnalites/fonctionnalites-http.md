# Fonctionnalités HTTP (API Platform / Hydra)

Cette page fait partie des docs de fonctionnalités.

Le bridge fournit une base HTTP qui colle aux conventions courantes d’API Platform, tout en restant extensible.
L’objectif est de réduire le “boilerplate” dans les apps Angular, et de rendre les requêtes plus cohérentes (headers, credentials, timeouts, retries).

## Headers et formats (API Platform)

Le template embarque un interceptor `Content-Type` orienté JSON-LD/Hydra :

- `Accept: application/ld+json` si absent
- `Content-Type` :
  - `POST` / `PUT` → `application/ld+json`
  - `PATCH` → `application/merge-patch+json`

Cela évite d’avoir à répéter ces headers dans chaque appel.

## Defaults réseau (optionnels)

Le bridge peut appliquer des defaults via `provideBridge({ defaults: ... })` :

- headers communs (ajoutés si absents sur la requête)
- timeout réseau (`timeoutMs`)
- retries “safe” (`retries`), appliqués par défaut sur `GET/HEAD/OPTIONS`

## Repository et facades

Le runtime expose des abstractions simples :

- un repository REST pour les opérations CRUD et les requêtes génériques
- une factory de facades pour instancier une façade par ressource (`/api/conversations`, etc.)

L’intention est d’avoir un point d’entrée cohérent (list/get/create/update/delete + request) plutôt que des appels HTTP dispersés.
