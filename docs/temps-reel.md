# Temps réel

Prérequis : `mercure.hubUrl` et `mercure.authorize` dans [`provideBridge()`](configuration.md), et des ressources publiées par le backend ([Backend](backend.md)).

## Écouter

```ts
this.projects.watch$();                        // toute la ressource : créations, modifications, suppressions
this.projects.watch$('/api/projects/42');      // un seul projet
```

Les deux renvoient `Observable<Project | ResourceDeletion>` :

- une création ou une modification émet la ressource publiée par API Platform ;
- une suppression émet `{"@id": "/api/projects/42"}`, reconnu par `isResourceDeletion()`.

L'abonnement au hub vit tant que l'Observable est souscrit. Plusieurs écoutes identiques partagent le même abonnement.

## Appliquer les événements au store

Le bridge ne stocke rien : c'est au repository de répercuter chaque événement dans le store de l'application.

```ts
watch$(iri?: Iri): Observable<Project | ResourceDeletion> {
  return this.projects.watch$(iri).pipe(
    tap((resource) => {
      if (isResourceDeletion(resource)) this.store.remove(resource['@id']);
      else this.store.upsert(resource);
    }),
  );
}
```

Le composant qui affiche le projet lit le signal du store : il se met à jour seul. Voir la recette complète dans [Recettes](recettes.md#crud-temps-réel).

## Limiter l'écoute à la durée de vie d'un écran

```ts
export class ProjectDetailPage {
  private readonly service = inject(ProjectService);
  readonly iri = input.required<string>();
  readonly project = computed(() => this.service.project(this.iri())());   // lecture pure du store

  constructor() {
    // Chargement et abonnement suivent l'IRI affichée et s'arrêtent quand la page est détruite.
    effect((onCleanup) => {
      const iri = this.iri();
      this.service.load(iri);
      const subscription = this.service.watch$(iri).subscribe();
      onCleanup(() => subscription.unsubscribe());
    });
  }
}
```

Pour une IRI fixe : `this.service.watch$(iri).pipe(takeUntilDestroyed()).subscribe()`.

## Ce que contient un événement

Le payload est la ressource sérialisée par API Platform au moment de l'écriture. Sans groupes de sérialisation, c'est la représentation du GET : elle remplace directement l'entrée du store.

Les relations restent des IRI. Si l'écran affiche une donnée liée (le nombre de tâches d'un projet), faites publier aussi la ressource parente par le backend, ou rechargez-la.

## Choisir la connexion

| Besoin | Option |
|---|---|
| Cas général | rien (`connection: 'shared'`) |
| Écran critique, isolé des reconnexions des autres écrans | `{connection: 'dedicated'}` |
| Plusieurs flux à regrouper entre eux, à l'écart des autres | `{connection: 'admin'}` (n'importe quel nom) |

```ts
this.projects.watch$(iri, {connection: 'dedicated'});
```

Une connexion partagée est rouverte (avec reprise) chaque fois qu'un écran ajoute ou retire un abonnement. Une connexion dédiée ne bouge pas tant que son abonnement est actif. Préférez le partage : en HTTP/1.1, un navigateur limite le nombre de connexions par domaine (environ six).

## Écouter un topic qui n'est pas une IRI d'item

Notifications d'un utilisateur, topic d'un autre service, topic alternatif publié avec l'option `topics` d'API Platform :

```ts
private readonly bridge = inject(BridgeFacade);

notifications$ = this.bridge.watch$<Notification>({match: '/users/42/notifications'});
orders$ = this.bridge.watch$<Order>({match: '/api/orders/:id', type: 'urlpattern'});
```

`BridgeFacade.watch$()` émet le JSON reçu **sans filtre**. Par défaut il utilise une connexion dédiée : tout ce qui arrive sur cette connexion concerne donc cet abonnement.

## Authentification et expiration

Avec `mercure.authorize`, le bridge appelle l'endpoint avant la première connexion, puis à chaque connexion refusée par le hub (token expiré, droits insuffisants). Rien à faire côté application.

Le hub ferme une connexion avant l'expiration de son token, et le navigateur se reconnecte seul. Si l'endpoint répond `{"expiresIn": 600}`, le bridge renouvelle le cookie 5 secondes avant son expiration : les reconnexions partent avec un token valide et reprennent les événements manqués, sans refus. Voir [Backend](backend.md#autoriser-les-abonnés).

Le hub n'évalue les droits qu'à l'ouverture d'une connexion. Après un login ou un logout **sans rechargement de page** :

```ts
inject(BridgeFacade).reconnectRealtime();   // renouvelle le cookie et rouvre les connexions
```

Une autorisation encore en cours au moment de l'appel (celle de l'ancienne identité) est laissée finir, puis une nouvelle est demandée : le cookie posé en dernier est celui de l'utilisateur courant, et aucune connexion ne s'ouvre avant.

## Afficher l'état de la connexion

```ts
readonly status = this.projects.connectionStatus;   // Signal<'closed' | 'connecting' | 'connected'>
```

```html
@if (status() === 'connecting') { <span>Reconnexion…</span> }
```

`BridgeFacade.realtimeDiagnostics$()` détaille chaque connexion : groupe, URL, abonnements, dernier événement reçu, échecs. Utile dans un panneau de debug.

## Bon à savoir

- **Reprise.** Après une coupure, le bridge demande les événements manqués (`last_event_id`) ; le hub ne rejoue que ce qu'il a conservé. Après une longue absence, rechargez les données affichées.
- **Navigateurs.** `watch$()` sans IRI utilise `URLPattern`. Pour un navigateur qui ne le fournit pas, chargez [`urlpattern-polyfill`](https://www.npmjs.com/package/urlpattern-polyfill).
- **Événements typés.** Une ressource publiée avec l'option Mercure `type` envoie un événement nommé, que le bridge n'écoute pas.
- **Payload personnalisé.** Avec l'option Mercure `data`, le bridge ne peut plus distinguer une suppression ni filtrer par `@id` : écoutez alors le topic avec `BridgeFacade.watch$()`.
- **SSR.** Aucune connexion n'est ouverte côté serveur : `watch$()` y termine immédiatement.
