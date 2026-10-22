# Foundation Webfront

Frontend Angular 22 + Spartan UI + Tailwind 4 du template Foundation.
Il est relie au backend via le bridge Meridiane genere localement.

## Workflow nominal

```bash
docker compose up --build -d
make lint
make build
```

Le flux standard du repo est Docker-first.
Les scripts `npm run ...` restent les primitives du conteneur `webfront`, mais la DX nominale passe par le `Makefile` racine.

## Bridge

Le bridge vit dans `webfront/bridge/` et est versionne dans le repo.
Quand le contrat backend change :

```bash
make bridge
```

## Conventions frontend

- Angular 22 standalone, zoneless et `OnPush` par defaut ;
- Spartan UI comme unique kit d'interface ;
- primitives Helm generees dans `src/app/shared/ui/`, gerees exclusivement par le CLI et jamais modifiees manuellement ;
- pages et composites applicatifs composes hors de `src/app/shared/ui/` ;
- une seule feuille globale `src/styles.css`, une palette neutre noire et les modes `light` / `dark` ;
- classes Tailwind standard dans le code applicatif, sans valeurs arbitraires ;
- icones Lucide uniquement ;
- code compatible zoneless ;
- architecture `store -> repository -> service -> composant` ;
- `AppTable` pour les listes paginees standard ;
- aucune modification manuelle du bridge.

## Documentation

- scope frontend : `webfront/AGENTS.md`
- guide frontend : `webfront/docs/README.md`
- source de verite UI : `webfront/docs/ui/spartan.md`
- docs projet durables : `docs/project/README.md`
- pattern bridge : `.codex/patterns/bridge/contract-generation.md`
