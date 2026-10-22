# HTTP

## Une façade par ressource

```ts
@Injectable({providedIn: 'root'})
export class ProjectRepository {
  private readonly projects = inject(FacadeFactory).create<Project>({url: '/api/projects'});
}
```

`url` est le chemin de la collection. Créez la façade une fois (champ d'un service) : elle ne garde aucun état.

## Lire

```ts
this.projects.get$('/api/projects/42');                 // Observable<Project>

this.projects.getCollection$({                          // Observable<Collection<Project>>
  page: 2,
  itemsPerPage: 20,
  filters: {
    name: 'refonte',                                    // ?name=refonte
    'order[createdAt]': 'desc',                         // ?order[createdAt]=desc
    'status[]': ['open', 'blocked'],                    // ?status[]=open&status[]=blocked
  },
});
```

`Collection<T>` reprend la réponse Hydra : `member` (les éléments), `totalItems`, `view` (pages `first`, `next`…), `search`. Les noms de filtres sont ceux déclarés par vos filtres API Platform. Un objet de paramètres libre ou des `HttpParams` sont aussi acceptés.

Les IRI sont utilisées telles quelles. `get$(task.project)` charge le projet lié à une tâche.

## Écrire

```ts
this.projects.post$({name: 'Refonte'});                         // POST   /api/projects        application/ld+json
this.projects.patch$(iri, {archived: true});                    // PATCH  /api/projects/42     application/merge-patch+json
this.projects.put$(iri, {name: 'Refonte', archived: false});    // PUT    /api/projects/42
this.projects.delete$(iri);                                     // DELETE /api/projects/42     Observable<void>
```

Les corps sont typés `Partial<Project>`. Chaque appel renvoie un Observable froid : rien ne part tant qu'on ne s'y abonne pas, ou qu'on ne passe pas par `firstValueFrom()`.

## Requêtes particulières : `request$`

Pour une opération personnalisée, un upload ou une réponse qui n'est pas du JSON :

```ts
// Opération personnalisée
this.projects.request$<Project>({method: 'POST', url: `${iri}/archive`});

// Upload multipart : le navigateur fixe lui-même Content-Type et boundary
const body = new FormData();
body.append('file', file);
this.projects.request$<MediaObject>({method: 'POST', url: '/api/media_objects', body});

// Export CSV
this.projects.request$<string>({method: 'GET', query: {format: 'csv'}, responseType: 'text'});
```

Sans `url`, `request$` vise la collection de la façade.

## Endpoints hors ressource : `BridgeFacade`

```ts
private readonly bridge = inject(BridgeFacade);

session$ = this.bridge.get$<AuthSession>('/api/auth/session');
logout$ = this.bridge.post$<{redirectUrl: string}>('/api/auth/logout', {});
```

`BridgeFacade` propose les mêmes méthodes, avec l'URL en premier argument.

## Options par appel

```ts
this.projects.get$(iri, {headers: {'Accept-Language': 'en'}, withCredentials: true});
```

## Erreurs

Les erreurs sont des `HttpErrorResponse` d'Angular. Le contrat fournit les modèles des erreurs d'API Platform, par exemple `ConstraintViolation` pour un 422 :

```ts
this.projects.post$(payload).pipe(
  catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const violations = (error.error as ConstraintViolation).violations ?? [];
      // violations[i].propertyPath, violations[i].message → erreurs du formulaire
    }
    return throwError(() => error);
  }),
);
```

## Ce que le bridge fait pour vous

| Comportement | Détail |
|---|---|
| `Accept` | `application/ld+json` si absent |
| `Content-Type` | `application/ld+json` en POST/PUT, `application/merge-patch+json` en PATCH, rien pour un `FormData` |
| `defaults.headers` | ajoutés s'ils sont absents |
| `defaults.timeoutMs` | interrompt la requête (option `timeout` native d'Angular) |
| `defaults.retries` | rejoue GET/HEAD/OPTIONS sur erreur réseau, 429 ou 5xx ; jamais sur 4xx |
| `singleFlight` | deux GET identiques simultanés ne partent qu'une fois |
| `auth` | ajoute `Authorization: Bearer …` |
| `debug` | journalise chaque requête, réponse et durée |

Ces comportements ne touchent que les requêtes vers `baseUrl`. Un en-tête déjà présent n'est jamais remplacé.
