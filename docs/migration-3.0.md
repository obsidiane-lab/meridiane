# Migrer de Meridiane 2.x vers 3.0

Meridiane 3.0 parle le protocole **Mercure 1.0**. Le hub, le bundle Symfony et le bridge migrent ensemble.

## 1. Backend

1. Passer à symfony/mercure ≥ 0.9 et symfony/mercure-bundle ≥ 0.6. Dans `mercure.yaml`, ajouter `protocol_version: '1.0'` et les claims `iss`, `sub`, `client_id` ([Backend](backend.md#symfonymercure-bundle)).
2. Passer à un hub Mercure 1.x (FrankenPHP ≥ 1.13). Dans le Caddyfile, remplacer `publisher_jwt` / `subscriber_jwt` par un bloc `issuer`, et retirer `demo`, qui n'existe plus ([Backend](backend.md#hub-mercure)).
3. Remplacer le cookie `mercureAuthorization` par celui du bundle (`Authorization::createCookie`). Le JWT porte `authorization_details` : remplacer `subscribe: ['*']` par les droits réels de l'utilisateur ([Backend](backend.md#autoriser-les-abonnés)).
4. Supprimer les topics de collection (`'/api/projects'`) : le front écoute la ressource par URL Pattern.

## 2. Génération

| 2.x | 3.0 |
|---|---|
| `--formats application/ld+json` | supprimé : le contrat est lu tel quel, les formats se règlent dans `api_platform.formats` |
| `meridiane dev` sans nom de package | `meridiane dev <packageName>` obligatoire |
| `Project` et `ProjectLdJson` identiques | un seul modèle `Project` |

## 3. Configuration Angular

```ts
// 2.x
provideBridge({
  baseUrl,
  mercure: {hubUrl, topicMode: 'iri', init: {credentials: 'include'}, connectionMode: 'auto', maxUrlLength: 1900},
});

// 3.0
provideBridge({
  baseUrl,
  mercure: {hubUrl, authorize: '/api/mercure/authorization'},
});
```

| 2.x | 3.0 |
|---|---|
| `mercure.topicMode` | supprimé : les topics sont des URL absolues, comme ceux d'API Platform |
| `mercure.init: {credentials}` | `mercure.withCredentials` (défaut `true`) |
| `http.withCredentials` déduit de Mercure | `http.withCredentials`, `false` par défaut |
| `mercure.connectionMode`, `{newConnection: true}` | `watch$(…, {connection: 'dedicated'})` ou un nom de connexion |
| `mercure.maxUrlLength` (1900) | `mercure.maxUrlLength` (4000), plus 100 abonnements maximum par connexion |
| service applicatif qui obtient le cookie Mercure | `mercure.authorize` : le bridge l'obtient et le renouvelle |

## 4. Code

| 2.x | 3.0 |
|---|---|
| `IriRequired`, `Iri` (pouvant être `undefined`) | `Iri = string` ; écrire `Iri \| undefined` là où l'IRI est optionnelle |
| `facade.watch$('/api/projects')` (topic collection) | `facade.watch$()` |
| `facade.watch$([iri1, iri2])` | un `watch$(iri)` par item, ou `watch$()` pour la ressource |
| `facade.unwatch(iri)` | `subscription.unsubscribe()` |
| suppression reçue par SSE stockée comme entité | `isResourceDeletion(resource)` → `store.remove(resource['@id'])` |
| `watchSubResource$(parentIri, field)` | `watch$()` sur la ressource enfant et filtre sur la relation ([recette](recettes.md#afficher-les-éléments-liés)) |
| `bridge.watch$(iris)`, `bridge.watchTypes$()` | `bridge.watch$({match, type?})` : topic explicite, flux brut |
| `FacadeConfig.repo`, `ApiPlatformRestRepository` | supprimés |
| `HttpRequestConfig.options` | supprimé : `headers`, `query`, `body`, `responseType`, `withCredentials` |
| `joinUrl`, `resolveUrl` exportés | internes au bridge |
| `RealtimeDiagnostics` (une connexion) | `{status, connections: [...]}` |

## 5. Vérifier

- Une page détail ouverte seule reçoit les modifications de son item.
- Une suppression faite ailleurs disparaît de l'écran.
- Après dix minutes, le temps réel fonctionne toujours (renouvellement du cookie).
- `debug: true` : aucun refus du hub en boucle dans la console.
