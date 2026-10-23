---
name: obsidiane-webapp-feature
description: "Webapp Foundation: parcours utilisateur, page, listing, CRUD, formulaire, table, route ou action visible."
---

# Webapp feature

1. Lire `AGENTS.md`, `core/AGENTS.md` et `webfront/AGENTS.md`.
2. Lire `.agents/skills/spartan/SKILL.md` pour toute surface Angular visible.
3. Classifier la demande :
   - CRUD ou ressource visible -> `.codex/recipes/crud-fullstack.md` ;
   - page, composant, route, formulaire ou table Angular -> `.codex/recipes/frontend-page.md` ;
   - feature transverse decrite en termes produit -> `.codex/recipes/feature-delivery.md`.
4. Inspecter un exemple ou un module equivalent.
5. Utiliser les generateurs natifs quand ils couvrent le besoin : `php bin/console make:*`,
   `php bin/console d:m:diff` et `ng generate` pour le code applicatif.
6. Respecter `store -> repository -> service -> composant`.
7. Pour toute UI, appliquer sans variante locale les invariants de `webfront/AGENTS.md` et le
   workflow du skill `spartan`.
8. Regenerer le bridge avec `make bridge` si le contrat API visible change.
9. Evaluer une strategie Mercure/SSE pour tout CRUD visible, y compris `non necessaire` avec
    justification.
10. Basculer vers `obsidiane-security` si ownership, role, XSRF ou donnee sensible domine, ou vers
    `obsidiane-realtime-sync` si la synchronisation live domine.
11. Executer le plus petit check suffisant et indiquer le statut documentation durable.
