# Recettes

Des cas concrets, avec l'organisation recommandée : **store** (stockage des signaux) → **repository** (seul à parler au bridge et au store) → **service** (logique métier) → **composant** (affichage).

- [CRUD temps réel](#crud-temps-réel)
- [Liste paginée rechargée en direct](#liste-paginée-rechargée-en-direct)
- [Afficher les éléments liés](#afficher-les-éléments-liés)
- [Formulaire et erreurs de validation](#formulaire-et-erreurs-de-validation)
- [Envoyer un fichier](#envoyer-un-fichier)
- [Notifications personnelles](#notifications-personnelles)
- [Écran de supervision isolé](#écran-de-supervision-isolé)
- [Login et logout sans rechargement](#login-et-logout-sans-rechargement)

## CRUD temps réel

Un projet affiché à l'écran se met à jour seul quand quelqu'un le modifie ou le supprime ailleurs.

### Store : un signal par entité

```ts
export type EntityResource<T> = {
  state: 'idle' | 'loading' | 'ready' | 'notFound' | 'forbidden' | 'error' | 'deleted';
  value: T | null;
};

export abstract class EntityStore<T extends Item> {
  private readonly rows = new Map<Iri, WritableSignal<EntityResource<T>>>();
  private readonly keys = signal<readonly Iri[]>([]);

  /** Toutes les entités connues ayant une valeur. */
  readonly all = computed(() => this.keys().flatMap((iri) => this.rows.get(iri)?.().value ?? []));

  /** Toujours le même signal pour une IRI ; créer la ligne n'écrit aucun signal. */
  entity(iri: Iri): Signal<EntityResource<T>> {
    return this.row(iri).asReadonly();
  }

  set(iri: Iri, resource: EntityResource<T>): void {
    this.row(iri).set(resource);
    if (!this.keys().includes(iri)) this.keys.update((keys) => [...keys, iri]);
  }

  upsert(entity: T): void {
    if (entity['@id']) this.set(entity['@id'], {state: 'ready', value: entity});
  }

  upsertMany(entities: T[]): void {
    entities.forEach((entity) => this.upsert(entity));
  }

  remove(iri: Iri): void {
    this.set(iri, {state: 'deleted', value: null});
  }

  /** Remet toutes les lignes à `idle` ; les signaux déjà lus restent valides. */
  clear(): void {
    this.keys().forEach((iri) => this.rows.get(iri)?.set({state: 'idle', value: null}));
    this.keys.set([]);
  }

  private row(iri: Iri): WritableSignal<EntityResource<T>> {
    let row = this.rows.get(iri);
    if (!row) this.rows.set(iri, (row = signal<EntityResource<T>>({state: 'idle', value: null})));
    return row;
  }
}

@Injectable({providedIn: 'root'})
export class ProjectStore extends EntityStore<Project> {}
```

### Repository : bridge → store

```ts
@Injectable({providedIn: 'root'})
export class ProjectRepository {
  private readonly store = inject(ProjectStore);
  private readonly projects = inject(FacadeFactory).create<Project>({url: '/api/projects'});

  entity(iri: Iri): Signal<EntityResource<Project>> {
    return this.store.entity(iri);
  }

  /** Charge le projet s'il est inconnu. `untracked` : appelé depuis un effect, il ne doit pas le rendre dépendant du store. */
  load(iri: Iri): void {
    untracked(() => {
      if (this.store.entity(iri)().state === 'idle') this.fetch$(iri).subscribe({error: () => undefined});
    });
  }

  fetch$(iri: Iri): Observable<Project> {
    const previous = this.store.entity(iri)().value;
    this.store.set(iri, {state: 'loading', value: previous});

    return this.projects.get$(iri).pipe(
      tap((project) => this.store.upsert(project)),
      catchError((error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        this.store.set(iri,
          status === 404 ? {state: 'notFound', value: null}
          : status === 403 ? {state: 'forbidden', value: null}
          : {state: 'error', value: previous});
        return throwError(() => error);
      }),
    );
  }

  list$(query: Query): Observable<Collection<Project>> {
    return this.projects.getCollection$(query).pipe(tap((page) => this.store.upsertMany(page.member)));
  }

  create$(payload: Partial<Project>): Observable<Project> {
    return this.projects.post$(payload);
  }

  update$(iri: Iri, changes: Partial<Project>): Observable<Project> {
    return this.projects.patch$(iri, changes);
  }

  delete$(iri: Iri): Observable<void> {
    return this.projects.delete$(iri).pipe(tap(() => this.store.remove(iri)));
  }

  /** Sans IRI : tous les projets. Chaque événement est appliqué au store. */
  watch$(iri?: Iri): Observable<Project | ResourceDeletion> {
    return this.projects.watch$(iri).pipe(
      tap((resource) => {
        if (isResourceDeletion(resource)) this.store.remove(resource['@id']);
        else this.store.upsert(resource);
      }),
    );
  }
}
```

Les créations et modifications reviennent par Mercure : `watch$` met le store à jour sur tous les écrans, celui qui a écrit compris. La réponse HTTP sert à l'UX immédiate (navigation vers l'IRI créée, message). La suppression est appliquée tout de suite, sans attendre l'événement.

### Service : la logique métier

```ts
@Injectable({providedIn: 'root'})
export class ProjectService {
  private readonly projects = inject(ProjectRepository);

  project(iri: Iri) { return this.projects.entity(iri); }
  load(iri: Iri) { this.projects.load(iri); }
  list$(query: Query) { return this.projects.list$(query); }
  watch$(iri?: Iri) { return this.projects.watch$(iri); }

  create(payload: Partial<Project>): Promise<Project> {
    return firstValueFrom(this.projects.create$(payload));
  }

  archive(iri: Iri): Promise<Project> {
    return firstValueFrom(this.projects.update$(iri, {archived: true}));
  }
}
```

### Composant : afficher le signal

```ts
@Component({
  selector: 'app-project-detail',
  template: `
    @switch (project().state) {
      @case ('loading') { <p>Chargement…</p> }
      @case ('notFound') { <p>Projet introuvable.</p> }
      @case ('deleted') { <p>Ce projet vient d'être supprimé.</p> }
      @case ('ready') {
        <h1>{{ project().value!.name }}</h1>
        <button (click)="archive()">Archiver</button>
      }
    }
  `,
})
export class ProjectDetailPage {
  private readonly service = inject(ProjectService);
  readonly iri = input.required<string>();
  readonly project = computed(() => this.service.project(this.iri())());

  constructor() {
    effect((onCleanup) => {
      const iri = this.iri();
      this.service.load(iri);
      const subscription = this.service.watch$(iri).subscribe();
      onCleanup(() => subscription.unsubscribe());
    });
  }

  archive() {
    return this.service.archive(this.iri());
  }
}
```

Ouvrez le même projet dans deux onglets : une modification dans l'un s'affiche dans l'autre, une suppression affiche « Ce projet vient d'être supprimé ».

## Liste paginée rechargée en direct

La liste affichée est la page renvoyée par le serveur (tri, filtres, pagination). Un événement sur la ressource relance simplement la requête de la page courante.

```ts
export class ProjectListPage {
  private readonly service = inject(ProjectService);
  readonly page = signal(1);
  readonly projects = signal<Collection<Project> | undefined>(undefined);

  constructor() {
    effect((onCleanup) => {
      const query = {page: this.page(), itemsPerPage: 20, filters: {'order[createdAt]': 'desc'}};
      const changes$ = this.service.watch$().pipe(debounceTime(300));   // rafales d'événements → un seul rechargement

      const subscription = merge(of(null), changes$)
        .pipe(switchMap(() => this.service.list$(query)))
        .subscribe((projects) => this.projects.set(projects));
      onCleanup(() => subscription.unsubscribe());
    });
  }
}
```

Changer de page ne recrée pas l'abonnement au hub : l'ancienne et la nouvelle écoute sont identiques et sont fusionnées.

## Afficher les éléments liés

Les tâches d'un projet : chargées par filtre, puis tenues à jour par l'écoute de toute la ressource `Task`. Le filtre est un simple `computed` sur le store.

```ts
// TaskRepository
listByProject$(project: Iri) {
  return this.tasks.getCollection$({filters: {project}}).pipe(tap((page) => this.store.upsertMany(page.member)));
}

// ProjectTasksComponent (TaskService expose `all`, le signal `all` du store via le repository)
readonly projectIri = input.required<string>();
readonly tasks = computed(() => this.taskService.all().filter((task) => task.project === this.projectIri()));

constructor() {
  effect((onCleanup) => {
    const project = this.projectIri();
    const subscription = merge(this.taskService.listByProject$(project), this.taskService.watch$()).subscribe();
    onCleanup(() => subscription.unsubscribe());
  });
}
```

Une tâche créée, déplacée ou supprimée ailleurs apparaît ou disparaît de la liste sans rechargement. `task.project` reste une IRI : pour afficher le nom du projet, lisez `projectService.project(task.project)`.

## Formulaire et erreurs de validation

API Platform renvoie un 422 avec la liste des violations, typée par le modèle généré `ConstraintViolation`.

```ts
async save(): Promise<void> {
  try {
    const project = await this.service.create(this.form.getRawValue());
    await this.router.navigateByUrl(`/projects/${project.id}`);
  } catch (error) {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      for (const violation of (error.error as ConstraintViolation).violations ?? []) {
        this.form.get(violation.propertyPath)?.setErrors({server: violation.message});
      }
      return;
    }
    throw error;
  }
}
```

## Envoyer un fichier

Upload multipart vers une ressource `MediaObject`, puis rattachement au projet :

```ts
async uploadCover(project: Iri, file: File): Promise<void> {
  const body = new FormData();
  body.append('file', file);

  const media = await firstValueFrom(
    this.bridge.request$<MediaObject>({method: 'POST', url: '/api/media_objects', body}),
  );
  await firstValueFrom(this.projects.update$(project, {cover: media['@id']}));
}
```

Avec un `FormData`, le bridge n'impose pas de `Content-Type` : le navigateur ajoute la frontière multipart.

## Notifications personnelles

Le backend publie sur un topic privé par utilisateur ([Backend](backend.md#publier-sur-un-topic-personnalisé)), autorisé par le cookie Mercure.

```ts
@Injectable({providedIn: 'root'})
export class NotificationService {
  private readonly bridge = inject(BridgeFacade);
  readonly items = signal<Notification[]>([]);

  listen(userId: number) {
    return this.bridge
      .watch$<Notification>({match: `/users/${userId}/notifications`})   // connexion dédiée, flux non filtré
      .pipe(tap((notification) => this.items.update((items) => [notification, ...items])));
  }
}
```

Abonnez-vous une fois, dans le shell de l'application, après la connexion de l'utilisateur.

## Écran de supervision isolé

Un tableau de bord suit beaucoup de ressources. Le regrouper sur ses propres connexions évite que ses abonnements fassent rouvrir les connexions du reste de l'application, et inversement :

```ts
const options = {connection: 'supervision'};

merge(
  this.projects.watch$(undefined, options),
  this.tasks.watch$(undefined, options),
  this.incidents.watch$(undefined, options),
).pipe(takeUntilDestroyed()).subscribe();
```

## Login et logout sans rechargement

Le hub n'évalue les droits qu'à l'ouverture d'une connexion. Si le login ou le logout ne recharge pas la page :

```ts
async login(credentials: Credentials): Promise<void> {
  await firstValueFrom(this.auth.login$(credentials));
  this.bridge.reconnectRealtime();   // nouveau cookie Mercure, connexions rouvertes avec les nouveaux droits
}

async logout(): Promise<void> {
  await firstValueFrom(this.auth.logout$());   // le backend efface le cookie Mercure
  this.projectStore.clear();                     // ne pas laisser les données du compte précédent
  this.bridge.reconnectRealtime();
}
```
