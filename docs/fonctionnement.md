# Fonctionnement

```text
                 meridiane generate
contrat OpenAPI ───────────────────▶ bridge
                                       ├─ modèles          Project, Task, ConstraintViolation…
                                       ├─ provideBridge()  HttpClient + intercepteurs + options
                                       ├─ FacadeFactory    → ResourceFacade<T> : HTTP + watch$() d'une ressource
                                       ├─ BridgeFacade     HTTP ad hoc, topics explicites, état Mercure
                                       └─ MercureHub       connexions EventSource partagées
```

## Les modèles

Meridiane lit **tous** les schémas du contrat, sans filtre de format. Les formats exposés se règlent côté API Platform (`api_platform.formats`).

API Platform décrit une ressource plusieurs fois : `Project.jsonld` (lecture JSON-LD), `Project` (corps des requêtes), `Project.multipart`… Les représentations de même forme donnent **un seul modèle** :

```ts
export interface Project extends Item {   // Item : '@id', '@type', '@context'
  id?: number;
  name: string;
  archived?: boolean;
}
```

- Une représentation de forme différente garde son propre modèle, suffixé par sa variante (`ErrorJson`, `ProjectMultipart`).
- Les schémas `Hydra*` sont couverts par `Item` et `Collection<T>`.
- Les corps `PATCH` (merge-patch) n'ont pas de modèle : ils sont typés `Partial<T>`.
- Une propriété est optionnelle (`?`) si le contrat ne la déclare pas requise.

Types pris en charge (OpenAPI 3.0 et JSON Schema 2020-12 d'OpenAPI 3.1) : primitives et unions de `type`, objets et dictionnaires, tableaux et tuples, `enum` et `const`, `allOf` / `oneOf` / `anyOf`, `nullable`, références locales (`components.schemas`, `$defs`). Les règles sans équivalent TypeScript (`pattern`, bornes numériques, `uniqueItems`…) restent à valider à l'exécution. Les références externes doivent être regroupées dans le document fourni au CLI.

## Une requête HTTP

```text
projects.get$('/api/projects/1')
  → URL résolue contre baseUrl               (voir ci-dessous)
  → défauts : en-têtes, timeout, retry
  → Accept / Content-Type JSON-LD ou merge-patch, s'ils sont absents
  → auth : Bearer ou intercepteur fourni
  → extraInterceptors de l'application
  → singleFlight : une seule requête pour deux GET identiques simultanés
  → HttpClient (fetch)
```

`singleFlight` compare les requêtes après vos intercepteurs : deux GET qui diffèrent par un en-tête ajouté depuis un `HttpContext` partent tous les deux.

Les requêtes, l'endpoint `authorize` et les topics Mercure suivent la même règle d'URL :

| Chemin | Avec `baseUrl: 'https://example.com/backend'` |
|---|---|
| `/api/projects/1` (comme un `@id` d'API Platform) | `https://example.com/api/projects/1` : depuis la racine de l'origine |
| `projects/1` | `https://example.com/backend/projects/1` : relatif à `baseUrl` |
| `https://cdn.example.com/x` | inchangée |

Les étapes du bridge ne s'appliquent qu'aux requêtes vers `baseUrl`. Vos autres appels HTTP (CDN, service tiers) ne reçoivent ni en-têtes JSON-LD ni token. Les `extraInterceptors` s'appliquent, eux, à toutes les requêtes.

## Un abonnement temps réel

```text
projects.watch$()                         abonnement à la ressource
  → sélecteur Mercure : https://app.example.com/api/projects/:id   (URL Pattern)
  → ajouté à une connexion EventSource partagée
        GET /.well-known/mercure?match_urlpattern=…&match=…
  ← API Platform publie à chaque écriture sur l'IRI de l'item
  ← le bridge garde les événements dont l'@id correspond au sélecteur
  → Observable<Project | ResourceDeletion>
```

- `watch$()` écoute **toute la ressource** (créations comprises) avec un URL Pattern. `watch$(iri)` écoute **un item**.
- Les topics publiés par API Platform sont des URL absolues. Le bridge résout donc les IRI et `baseUrl` en URL absolues ; un `baseUrl` relatif est résolu contre l'URL de la page.
- Mercure ne dit pas quel abonnement a reçu un événement : le bridge compare l'`@id` du payload au sélecteur.
- Le payload est celui publié par API Platform : la ressource complète, ou `{"@id": "/api/projects/1"}` pour une suppression. Le bridge ne fait aucun GET supplémentaire.

### Connexions

Les abonnements de toute l'application partagent le moins de connexions possible. Une connexion en prend tant que son URL reste sous `maxUrlLength` (4000 caractères) et sous 100 abonnements ; au-delà, le bridge en ouvre une autre. Deux composants qui écoutent la même chose partagent le même abonnement.

Mercure ne permet pas de modifier un flux ouvert : quand ses abonnements changent, une connexion est rouverte avec `last_event_id`, et le hub rejoue les événements manqués qu'il a conservés.

### Autorisation

```text
première connexion   → GET /api/mercure/authorization → cookie HttpOnly → EventSource
token expiré         → le hub coupe → reconnexion refusée (401)
                     → GET /api/mercure/authorization → nouvelle connexion
```

Avec `mercure.authorize`, le bridge obtient et renouvelle le cookie seul. Le délai entre deux tentatives croît de 1 à 30 secondes.

## Ce que le bridge ne fait pas

- Il ne stocke pas les données : c'est le rôle de vos stores.
- Il ne résout pas les relations : `task.project` reste une IRI, chargée par l'application si besoin.
- Il ne recharge pas une ressource après un événement : il transmet ce que le backend publie.
- Il ne garantit pas de rejouer tous les événements après une longue coupure : la reprise dépend de l'historique conservé par le hub.
