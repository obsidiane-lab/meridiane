# Démarrage

De l'API configurée jusqu'à une ressource suivie en temps réel dans Angular.

Les exemples utilisent une API qui expose `Project` (`/api/projects`) et `Task` (`/api/tasks`), et l'organisation de projet de la page [Backend](backend.md#architecture) : l'API dans `api/`, Angular dans `front/`.

## 1. Configurer le backend

Le bridge attend :

- des entités `#[ApiResource(mercure: true)]` ;
- un hub Mercure 1.x sur la même origine que le front ;
- un endpoint qui pose le cookie d'abonnement Mercure.

La configuration complète (FrankenPHP, Mercure, Symfony, API Platform) est dans [Backend](backend.md).

## 2. Générer le bridge

Exportez le contrat OpenAPI de l'API, puis générez le bridge dans l'application Angular :

```bash
# dans api/
docker compose exec php bin/console api:openapi:export --output=openapi.json

# dans front/
npx @obsidiane/meridiane@3 generate @app/bridge --spec ../api/openapi.json --out bridge
```

Le bridge est écrit dans `front/bridge/`. Déclarez-le dans `tsconfig.json` :

```json
{
  "compilerOptions": {
    "paths": {
      "@app/bridge": ["./bridge/src/public-api"]
    }
  }
}
```

Commitez `bridge/` et relancez ces deux commandes quand le contrat de l'API change (nouvelle ressource, nouveau champ…). Ne modifiez jamais ses fichiers à la main.

> `--spec` accepte aussi une URL : `https://api.example.com/api/docs.jsonopenapi`. Pour publier le bridge sur un registre npm plutôt que de le garder dans le projet, voir [CLI](cli.md).

## 3. Brancher le bridge

```ts
// src/app/app.config.ts
import {ApplicationConfig, isDevMode} from '@angular/core';
import {provideBridge} from '@app/bridge';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBridge({
      baseUrl: '/',
      mercure: {
        hubUrl: '/.well-known/mercure',
        authorize: '/api/mercure/authorization',
      },
      debug: isDevMode(),
    }),
  ],
};
```

`provideBridge()` installe aussi `HttpClient` : ne l'appelez pas une seconde fois avec `provideHttpClient()`. Les autres options sont décrites dans [Configuration Angular](configuration.md).

## 4. Lire une ressource

Créez une façade par ressource. Le type `Project` vient du bridge.

```ts
import {inject, Injectable} from '@angular/core';
import {FacadeFactory, type Iri, type Project} from '@app/bridge';

@Injectable({providedIn: 'root'})
export class ProjectRepository {
  private readonly projects = inject(FacadeFactory).create<Project>({url: '/api/projects'});

  list$() {
    return this.projects.getCollection$({page: 1});   // Observable<Collection<Project>>
  }

  get$(iri: Iri) {
    return this.projects.get$(iri);                    // Observable<Project>
  }
}
```

`getCollection$()` renvoie la collection Hydra : `member` (les projets), `totalItems` et `view` (la pagination).

## 5. Suivre une ressource en direct

```ts
watch$() {
  return this.projects.watch$();             // créations, modifications et suppressions de tous les projets
}

watchOne$(iri: Iri) {
  return this.projects.watch$(iri);          // un seul projet
}
```

Chaque événement est la ressource publiée par API Platform, ou `{"@id": …}` pour une suppression, que reconnaît `isResourceDeletion()`.

## 6. Vérifier

1. Ouvrez l'application dans deux onglets, sur `https://localhost`.
2. Modifiez un projet dans le premier : le second reçoit l'événement.
3. Dans la console, avec `debug`, la connexion Mercure s'ouvre une fois, sans refus du hub.

Si rien n'arrive, voir [Dépannage](depannage.md#temps-réel).

## Ensuite

- Ranger les données dans un store à signaux et les afficher : [Recettes](recettes.md).
- Lire, écrire, envoyer des fichiers : [HTTP](http.md).
- Choisir les connexions, gérer login et logout : [Temps réel](temps-reel.md).
- Comprendre ce que fait le bridge : [Fonctionnement](fonctionnement.md).
