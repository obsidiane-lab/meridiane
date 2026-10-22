# Upgrade source validation

## Quand utiliser

Upgrade, version, API externe, securite externe, OpenAPI, OpenAI/Codex,
Symfony, API Platform, Doctrine, Angular, Spartan, RxJS, Tailwind, TypeScript, Mercure
ou contradiction documentaire liee a une source instable.

## Lire d'abord

- `AGENTS.md`
- skill `obsidiane-upgrade-source-validation`
- `.codex/guides/source-validation.md`
- `webfront/AGENTS.md` et le skill technique `spartan` si l'upgrade touche l'UI

## Workflow

1. Identifier la question exacte, la version concernee et le comportement a
   verifier.
2. Chercher une source officielle recente quand une version, API, securite ou
   information externe compte.
3. Distinguer fait source, interpretation et decision projet.
4. Appliquer uniquement le changement demande.
5. Si un contrat API change, corriger le backend puis regenerer le bridge.
6. Si Angular ou le frontend change, respecter `store -> repository -> service -> composant`.
7. Si Spartan change, inspecter le contexte avec `npm run ng -- generate @spartan-ng/cli:info --json` et lancer le healthcheck avec `--auto-fix --dry-run --interactive=false` ; toute generation ou migration de `shared/ui/**` doit etre explicitement dans le scope.
8. Executer les checks proportionnes.

## Pattern cards

Lire la pattern card de la couche touchee seulement si une implementation est
necessaire.

## Checks

- `make phpstan` si backend/dependance PHP touche.
- `make bridge` puis `make build` si contrat API visible change.
- `make lint && make build` si Angular/frontend touche.
- `npm run ng -- generate @spartan-ng/cli:healthcheck --auto-fix --dry-run --interactive=false` si Spartan ou ses composants changent.

## Documentation durable

Mettre a jour `docs/project/` si la version, la source ou l'upgrade change une
convention, un contrat applicatif ou une architecture durable.
