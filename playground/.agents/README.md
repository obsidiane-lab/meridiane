# Skills Foundation

Ce dossier est le registre statique des skills du template Foundation. Il est
destine a etre lu par Codex, pas modifie par les workflows applicatifs.

Les skills `obsidiane-*` sont des competences de livraison. Les technologies
restent normalement des references techniques chargees a la demande via
`.codex/recipes/`, `.codex/patterns/`, `core/docs/` et `webfront/docs/`. Un skill
technique externe peut completer ce socle lorsqu'il est explicitement integre au
template.

## Regle commune

Un skill principal doit aider a router l'intention utilisateur avant de charger
les details techniques. Pour une tache standard :

1. lire `AGENTS.md` ;
2. choisir un seul skill principal ;
3. lire une seule recipe principale ;
4. lire seulement les pattern cards et references utiles ;
5. inspecter un exemple ou un code existant equivalent ;
6. utiliser les generateurs natifs quand ils couvrent le besoin ;
7. executer le plus petit check suffisant.

## Skills principaux

- `obsidiane-project-bootstrap`
- `obsidiane-feature-delivery`
- `obsidiane-webapp-feature`
- `obsidiane-api-backend`
- `obsidiane-frontend-ux`
- `obsidiane-api-contract`
- `obsidiane-realtime-sync`
- `obsidiane-async-workflow`
- `obsidiane-security`
- `obsidiane-intervention-debug`
- `obsidiane-review`
- `obsidiane-upgrade-source-validation`
- `obsidiane-durable-documentation`

## Skills techniques complementaires

- `spartan` : skill technique du template pour toute UI Angular. Il complete le
  skill principal `obsidiane-*`, impose la frontiere du code Helm genere et
  guide la selection, la generation CLI, la composition et la verification Spartan.

Le skill `spartan` est maintenu et versionne dans ce repository. Ne pas le synchroniser
automatiquement depuis une source externe ; toute evolution passe par une maintenance agentique
explicite, avec validation des API Spartan installees et relecture des invariants Foundation.
