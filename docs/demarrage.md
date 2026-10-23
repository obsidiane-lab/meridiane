# Démarrage

En dix minutes : générer le bridge, le brancher dans Angular, lire une ressource puis la suivre en temps réel.

Les exemples utilisent une API qui expose `Project` (`/api/projects`) et `Task` (`/api/tasks`).

## 1. Générer le bridge

Depuis la racine de l'application Angular, pendant que l'API tourne :

```bash
npx @obsidiane/meridiane@3 generate @app/bridge \
  --spec http://localhost:8000/api/docs.json \
  --out bridge
```

Le bridge est écrit dans `bridge/`. Déclarez-le comme alias TypeScript dans `tsconfig.json` :

```json
{
  "compilerOptions": {
    "paths": {
      "@app/bridge": ["./bridge/src/public-api"]
    }
  }
}
```

Commitez `bridge/` et relancez la commande quand le contrat de l'API change (nouvelle ressource, nouveau champ, etc.). Ne modifiez jamais ses fichiers à la main.

> Deux autres façons de l'obtenir : `meridiane build` produit un package npm à publier, `meridiane dev` l'installe dans `node_modules`. Voir [CLI](cli.md).

## 2. Brancher le bridge

```ts
// app.config.ts
import {ApplicationConfig} from '@angular/core';
import {provideBridge} from '@app/bridge';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBridge({
      baseUrl: '/',
      mercure: {
        hubUrl: '/.well-known/mercure',
        authorize: '/api/mercure/authorization',
      },
    }),
  ],
};
```

`provideBridge()` installe aussi `HttpClient`. Ne l'appelez pas une seconde fois avec `provideHttpClient()`.

`baseUrl: '/'` suppose que le front, l'API et le hub sont servis sur la même origine. C'est la configuration recommandée ; les autres cas sont décrits dans [Configuration](configuration.md).

## 3. Lire une ressource

Créez une façade par ressource. Le type `Project` vient du bridge.

```ts
import {inject, Injectable} from '@angular/core';
import {FacadeFactory, type Project} from '@app/bridge';

@Injectable({providedIn: 'root'})
export class ProjectRepository {
  private readonly projects = inject(FacadeFactory).create<Project>({url: '/api/projects'});

  list$() {
    return this.projects.getCollection$({page: 1, itemsPerPage: 20});   // Observable<Collection<Project>>
  }

  get$(iri: string) {
    return this.projects.get$(iri);                                      // Observable<Project>
  }
}
```

`getCollection$()` renvoie la collection Hydra : `member` (les projets) et `totalItems`.

## 4. Suivre une ressource en direct

```ts
watch$() {
  return this.projects.watch$();             // créations, modifications et suppressions de tous les projets
}

watchOne$(iri: string) {
  return this.projects.watch$(iri);          // un seul projet
}
```

Chaque événement est la ressource publiée par API Platform, ou `{"@id": ...}` pour une suppression. Le backend doit publier les ressources sur Mercure et poser le cookie d'abonnement : voir [Backend](backend.md).

## Ensuite

- Ranger ces données dans un store à signaux et les afficher : [Recettes](recettes.md).
- Comprendre ce qui se passe sous le capot : [Fonctionnement](fonctionnement.md).
