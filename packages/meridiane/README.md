# @obsidiane/meridiane

Connecte une application Angular à une API API Platform, en HTTP et en temps réel (Mercure 1.0).

Le CLI lit le contrat OpenAPI de l'API et génère une librairie Angular, **le bridge** :

- les **modèles TypeScript** de vos ressources ;
- une **façade HTTP** par ressource, aux conventions d'API Platform (JSON-LD, Hydra, merge-patch) ;
- le **temps réel Mercure 1.0** : abonnement à une ressource ou à un item, connexions partagées, autorisation par cookie.

Le bridge gère la communication avec l'API ; la gestion des données reste dans votre application. Il est compatible avec Angular 20, 21 et 22, API Platform 5 et un hub Mercure 1.x.

## En bref

```bash
# Contrat exporté par Symfony, puis génération dans l'application Angular
docker compose exec php bin/console api:openapi:export --output=openapi.json
npx @obsidiane/meridiane@3 generate @app/bridge --spec ../api/openapi.json --out bridge
```

```ts
// app.config.ts
provideBridge({
  baseUrl: '/',
  mercure: {hubUrl: '/.well-known/mercure', authorize: '/api/mercure/authorization'},
});

// project.repository.ts
private readonly projects = inject(FacadeFactory).create<Project>({url: '/api/projects'});

list$ = this.projects.getCollection$({page: 1, itemsPerPage: 20});   // Collection<Project>
changes$ = this.projects.watch$();                                    // Project | ResourceDeletion, en direct
```

Le backend publie ses entités sur Mercure (`#[ApiResource(mercure: true)]`) et sert le front, l'API et le hub sur la même origine : voir la [configuration de référence](https://github.com/obsidiane-lab/meridiane/blob/master/docs/backend.md).

## Commandes

| Commande | Produit |
|---|---|
| `generate <package>` | les sources du bridge dans le projet (`--out`) |
| `build <package>` | un package compilé et son `.tgz` dans `dist/`, prêt à publier |
| `dev <package>` | le package compilé, installé dans `node_modules` |

Options : `--spec`, `--include`, `--exclude`, `--no-models`, `--version`, `--out`, `--debug`. Node.js ≥ 24.

## Documentation

- [Backend](https://github.com/obsidiane-lab/meridiane/blob/master/docs/backend.md) : FrankenPHP, Mercure, Symfony et API Platform
- [Démarrage](https://github.com/obsidiane-lab/meridiane/blob/master/docs/demarrage.md) · [Configuration Angular](https://github.com/obsidiane-lab/meridiane/blob/master/docs/configuration.md)
- [HTTP](https://github.com/obsidiane-lab/meridiane/blob/master/docs/http.md) · [Temps réel](https://github.com/obsidiane-lab/meridiane/blob/master/docs/temps-reel.md) · [Recettes](https://github.com/obsidiane-lab/meridiane/blob/master/docs/recettes.md)
- [Référence](https://github.com/obsidiane-lab/meridiane/blob/master/docs/reference.md) · [CLI](https://github.com/obsidiane-lab/meridiane/blob/master/docs/cli.md) · [Dépannage](https://github.com/obsidiane-lab/meridiane/blob/master/docs/depannage.md) · [Migration 2.x → 3.0](https://github.com/obsidiane-lab/meridiane/blob/master/docs/migration-3.0.md)
