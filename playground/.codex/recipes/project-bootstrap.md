# Bootstrap projet

## Quand utiliser

Deriver Foundation vers un projet concret : nom, branding, modules initiaux,
variables d'environnement, compose, secrets attendus, configuration OIDC,
environnements et premieres conventions.

## Lire d'abord

- `AGENTS.md`
- skill `obsidiane-project-bootstrap`
- `.codex/config.toml`
- `docs/project/project-derivation-checklist.md`
- `webfront/AGENTS.md` si le branding ou l'UI est touche
- les fichiers de configuration reellement touches

## Workflow

1. Identifier les noms, marques, URLs, ports, domaines, variables et secrets a
   adapter.
2. Distinguer socle Foundation et personnalisation projet.
3. Ne pas inventer de schema metier, role, endpoint public, worker ou convention
   produit sans besoin explicite.
4. Adapter seulement les fichiers necessaires : README, env, compose, Caddy,
   branding par les tokens semantiques du theme global, configuration runtime,
   documentation projet si durable.
5. Ne jamais modifier `webfront/bridge/` a la main.
6. Si le contrat API change pendant le bootstrap, corriger le backend puis
   lancer `make bridge`.
7. Laisser des placeholders explicites pour les secrets ou valeurs externes.
8. Verifier Compose, backend, frontend ou image selon les fichiers touches.

## Checks

- `docker compose config` si Compose/env runtime change.
- `make phpstan` si backend touche.
- `make lint && make build` si frontend ou config webfront touche.
- `make bridge` si contrat API visible change.
- `make docker-build` si Dockerfile ou production change.

## Documentation durable

Mettre a jour `docs/project/` si la derivation change une convention durable,
une architecture, une securite, un contrat public ou le role d'une capacite du
template.
