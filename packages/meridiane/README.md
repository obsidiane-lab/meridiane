# @obsidiane/meridiane

Génère, depuis le contrat OpenAPI d'API Platform, une librairie Angular (« le bridge ») :

- les **modèles TypeScript** de vos ressources ;
- un **client HTTP** aux conventions API Platform (JSON-LD, Hydra, merge-patch) ;
- le **temps réel Mercure 1.0** : abonnement à une ressource ou à un item, connexions partagées, autorisation par cookie.

Le bridge gère la connexion ; la gestion des données reste dans votre application. Il est compatible avec Angular 20, 21 et 22.

## En bref

```bash
npx @obsidiane/meridiane@3 generate @app/bridge --spec http://localhost:8000/api/docs.json --out bridge
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

## Commandes

| Commande | Produit |
|---|---|
| `generate <package>` | les sources du bridge dans le projet (`--out`) |
| `build <package>` | un package compilé et son `.tgz` dans `dist/`, prêt à publier |
| `dev <package>` | le package compilé, installé dans `node_modules` |

Options : `--spec`, `--include`, `--exclude`, `--no-models`, `--version`, `--out`, `--debug`. Node.js ≥ 24.

## Documentation

- [Démarrage](https://github.com/obsidiane-lab/meridiane/blob/master/docs/demarrage.md)
- [Configuration (cookies, auth, Mercure)](https://github.com/obsidiane-lab/meridiane/blob/master/docs/configuration.md)
- [HTTP](https://github.com/obsidiane-lab/meridiane/blob/master/docs/http.md) · [Temps réel](https://github.com/obsidiane-lab/meridiane/blob/master/docs/temps-reel.md) · [Backend](https://github.com/obsidiane-lab/meridiane/blob/master/docs/backend.md)
- [Recettes](https://github.com/obsidiane-lab/meridiane/blob/master/docs/recettes.md) · [Référence](https://github.com/obsidiane-lab/meridiane/blob/master/docs/reference.md) · [CLI](https://github.com/obsidiane-lab/meridiane/blob/master/docs/cli.md)
- [Dépannage](https://github.com/obsidiane-lab/meridiane/blob/master/docs/depannage.md) · [Migration 2.x → 3.0](https://github.com/obsidiane-lab/meridiane/blob/master/docs/migration-3.0.md)
