# Meridiane

![CI](https://github.com/obsidiane-lab/meridiane/actions/workflows/ci.yml/badge.svg)

Meridiane connecte une application **Angular** à une API **API Platform**, en HTTP et en temps réel (Mercure).

Le CLI lit le contrat OpenAPI de l'API et génère une librairie Angular, **le bridge**, qui contient :

- les **modèles TypeScript** de vos ressources ;
- une **façade HTTP** par ressource, aux conventions d'API Platform (JSON-LD, Hydra, merge-patch) ;
- le **temps réel Mercure 1.0** : créations, modifications et suppressions reçues en direct, avec des connexions partagées et une autorisation par cookie.

Le bridge s'occupe de la communication avec l'API. Les stores, la logique métier et l'affichage restent dans votre application.

## Exemple

Côté API, une entité Doctrine publiée sur Mercure :

```php
#[ORM\Entity]
#[ApiResource(mercure: true)]
class Project
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private string $name = '';

    // getters et setters
}
```

Côté Angular, après génération du bridge :

```ts
// app.config.ts
provideBridge({
  baseUrl: '/',
  mercure: {hubUrl: '/.well-known/mercure', authorize: '/api/mercure/authorization'},
});

// project.repository.ts
const projects = inject(FacadeFactory).create<Project>({url: '/api/projects'});

projects.getCollection$({page: 1});            // Observable<Collection<Project>>
projects.patch$('/api/projects/42', {name: 'Refonte'});
projects.watch$();                             // Observable<Project | ResourceDeletion>, en direct
```

## Installation

1. **Configurer le backend** : FrankenPHP, hub Mercure, Symfony et API Platform, sur une seule origine. Voir [Backend](docs/backend.md).
2. **Générer le bridge** depuis le contrat de l'API :

   ```bash
   # dans api/ : exporter le contrat OpenAPI
   docker compose exec php bin/console api:openapi:export --output=openapi.json

   # dans front/ : générer le bridge
   npx @obsidiane/meridiane@3 generate @app/bridge --spec ../api/openapi.json --out bridge
   ```

3. **Brancher le bridge** dans Angular avec `provideBridge()`. Voir [Configuration Angular](docs/configuration.md).
4. **Utiliser les façades** dans vos repositories. Voir [Démarrage](docs/demarrage.md).

## Compatibilité

| Élément | Version |
|---|---|
| Angular | 20, 21 ou 22, avec RxJS 7.8 |
| API Platform | 5, format JSON-LD |
| Mercure | hub 1.x (FrankenPHP ≥ 1.13), symfony/mercure-bundle ≥ 0.6 |
| CLI | Node.js ≥ 24 |

## Documentation

**[Lire la documentation →](docs/README.md)**

- [Démarrage](docs/demarrage.md) : générer le bridge, lire une ressource, la suivre en direct.
- [Backend](docs/backend.md) : la configuration de référence pour FrankenPHP, Mercure, Symfony et API Platform.
- [Configuration Angular](docs/configuration.md) : `provideBridge()`, serveur de développement, cookies, authentification.
- [HTTP](docs/http.md) · [Temps réel](docs/temps-reel.md) · [Recettes](docs/recettes.md) · [Référence](docs/reference.md) · [CLI](docs/cli.md) · [Dépannage](docs/depannage.md)
- [Migrer depuis Meridiane 2.x](docs/migration-3.0.md)

## Contribuer

Le développement de Meridiane lui-même (générateur, runtime, playground) est décrit dans [CONTRIBUTING.md](CONTRIBUTING.md).
