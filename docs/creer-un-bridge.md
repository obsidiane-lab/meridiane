# Créer un bridge (côté backend)

Ce guide s’adresse au **mainteneur** d’un backend (ex: Symfony / API Platform) qui veut publier un package npm “bridge” consommable par une ou plusieurs apps Angular.

Le workflow recommandé est :
- générer le bridge à partir de la spec OpenAPI ;
- produire un artefact npm (`dist/<libName>` + `.tgz`) ;
- publier sur un registry npm (public ou privé).

## Prérequis

- Node.js ≥ 18 (20+ recommandé)
- Accès à la spec OpenAPI du backend (URL ou fichier JSON)
- Droits de publication sur votre registry npm

## Génération (CI/CD)

Le build peut être lancé depuis **n’importe quel répertoire** (un runner CI “vide” suffit). Meridiane crée `dist/` dans le répertoire courant.

```bash
npx -y @obsidiane/meridiane@latest build @acme/backend-bridge \
  --version 1.2.3 \
  --spec https://staging.example/api/docs.json \
  --formats application/ld+json
```

Sorties :
- `dist/backend-bridge/` (package npm prêt à publier)
- `dist/backend-bridge/*.tgz` (tarball généré par `npm pack` pour inspection / artefact CI)

Notes importantes :
- génération “contract-driven” : les models sont générés à partir des endpoints réels (`paths`) et des formats demandés ;
- multi-format : `--formats` est répétable (ou liste `,`) et l’ordre est significatif (format primaire en premier) ;
- `PATCH` est typé en `Partial<T>` : pas de génération de modèles `*.jsonMergePatch` ;
- Meridiane ne publie pas : la CI reste responsable de `npm publish`.

## Publication

Publiez le dossier `dist/<libName>` (pas le `.tgz`) :

```bash
npm publish dist/backend-bridge
```

## Consommation (côté app Angular)

Une fois publié, le package est auto-documenté : le bridge contient son propre `README.md`.

Installation :

```bash
npm i @acme/backend-bridge@1.2.3
```

Configuration (standalone) :

```ts
import {bootstrapApplication} from '@angular/platform-browser';
import {provideBridge} from '@acme/backend-bridge';

bootstrapApplication(AppComponent, {
  providers: [
    provideBridge({
      baseUrl: 'https://api.example.com',
      // auth: {type: 'bearer', getToken: () => localStorage.getItem('token') ?? undefined},
      // mercure: {hubUrl: 'https://api.example.com/.well-known/mercure'},
    }),
  ],
});
```

Référence complète : `docs/consommer-un-bridge.md`.
