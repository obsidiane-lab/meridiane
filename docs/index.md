# Meridiane — Documentation

Meridiane est un CLI qui génère un **package npm “bridge” Angular** (runtime + models TypeScript) à partir d’une spec **OpenAPI** (API Platform).

Meridiane est **standalone** : pas de config persistante, pas de patch de workspace, tout sort sous `dist/` (workspace temporaire `dist/.meridiane-workspace`).

## Démarrer

- Workflow recommandé (générer → publier → consommer) : `docs/creer-un-bridge.md`
- Référence CLI (`dev`, `build`, options) : `docs/utilisation.md`

## Fonctionnalités du bridge généré

- API publique (entrée unique) : `docs/fonctionnalites/api-publique.md`
- HTTP (API Platform / Hydra) : `docs/fonctionnalites/fonctionnalites-http.md`
- Mercure / SSE : `docs/fonctionnalites/fonctionnalites-mercure-sse.md`
- FAQ / limites : `docs/fonctionnalites/faq.md`
