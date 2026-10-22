# __PACKAGE_NAME__

Bridge Angular de l'API, généré par [Meridiane 3](https://github.com/obsidiane-lab/meridiane/blob/master/docs/README.md) depuis son contrat OpenAPI. Ne pas modifier : régénérer quand le contrat change.

Il fournit les modèles TypeScript, le client HTTP (JSON-LD, Hydra, merge-patch) et le temps réel Mercure 1.0. Angular 20, 21 ou 22 ; RxJS 7.8.

## Configurer

```ts
import {provideBridge} from '__PACKAGE_NAME__';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBridge({
      baseUrl: '/',                                        // API sur la même origine que le front
      mercure: {
        hubUrl: '/.well-known/mercure',
        authorize: '/api/mercure/authorization',           // pose et renouvelle le cookie Mercure
      },
    }),
  ],
};
```

`provideBridge()` installe `HttpClient`. Options, cookies et topologies : [Configuration](https://github.com/obsidiane-lab/meridiane/blob/master/docs/configuration.md).

## Utiliser une ressource

```ts
import {FacadeFactory, isResourceDeletion, type Project} from '__PACKAGE_NAME__';

const projects = inject(FacadeFactory).create<Project>({url: '/api/projects'});

projects.getCollection$({page: 1, itemsPerPage: 20});   // Collection<Project>
projects.get$('/api/projects/42');                       // Project
projects.post$({name: 'Refonte'});
projects.patch$('/api/projects/42', {archived: true});
projects.delete$('/api/projects/42');

projects.watch$().subscribe((resource) => {             // toute la ressource, en direct
  if (isResourceDeletion(resource)) store.remove(resource['@id']);
  else store.upsert(resource);
});
```

Pour un endpoint hors ressource ou un topic Mercure personnalisé : `BridgeFacade`.

## Documentation

[Démarrage](https://github.com/obsidiane-lab/meridiane/blob/master/docs/demarrage.md) ·
[HTTP](https://github.com/obsidiane-lab/meridiane/blob/master/docs/http.md) ·
[Temps réel](https://github.com/obsidiane-lab/meridiane/blob/master/docs/temps-reel.md) ·
[Backend](https://github.com/obsidiane-lab/meridiane/blob/master/docs/backend.md) ·
[Recettes](https://github.com/obsidiane-lab/meridiane/blob/master/docs/recettes.md) ·
[Référence](https://github.com/obsidiane-lab/meridiane/blob/master/docs/reference.md) ·
[Dépannage](https://github.com/obsidiane-lab/meridiane/blob/master/docs/depannage.md)
