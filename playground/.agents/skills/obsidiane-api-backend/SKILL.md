---
name: obsidiane-api-backend
description: "Backend Foundation: API Platform, endpoint Symfony, service, Doctrine, migration, provider ou processor."
---

# API backend

1. Lire `AGENTS.md`.
2. Lire `core/AGENTS.md`.
3. Lire `.codex/recipes/backend-api-resource.md`.
4. Choisir la pattern card utile : entity API resource, DTO API resource, ownable, provider/processor ou voter.
5. Appliquer le contrat API d'abord.
6. Utiliser Entity `ApiResource` pour CRUD interne simple ; DTO `ApiResource` pour contrat public, stable, sensible ou divergent.
7. Utiliser `php bin/console make:*` quand MakerBundle couvre le besoin.
8. Generer les migrations simples avec `php bin/console d:m:diff`, relire, puis adapter seulement si necessaire.
9. Ajouter provider/processor seulement si l'etat ou la mutation sort du comportement natif.
10. Basculer vers `obsidiane-security` si ownership, tenant, role ou donnee sensible domine.
11. Basculer vers `obsidiane-api-contract` si le changement visible exige diagnostic ou regeneration du bridge.
12. Executer `make phpstan`, puis `make bridge` si contrat visible change.
