# Core Symfony / API Platform - instructions Codex

## Lire peu

Pour une tache backend, lire :

1. `AGENTS.md`
2. `.codex/recipes/backend-api-resource.md` ou `.codex/recipes/crud-fullstack.md`
3. une carte dans `.codex/patterns/backend/`
4. le code backend equivalent

Ne pas lire toute la doc backend par defaut.

## Invariants backend

- Contrat API d'abord.
- Les tests unitaires Symfony sont interdits : ne pas en creer ni en generer.
- Entity `ApiResource` pour CRUD interne simple.
- DTO `ApiResource` pour contrat public, stable, sensible ou divergent.
- Operations explicites.
- Relations exposees par IRI par defaut.
- Provider/processor seulement avec valeur concrete.
- Securite dans la couche la plus simple : operation, restriction Doctrine, Voter, processor/service.
- Collection et item doivent rester coherents.
- Squelettes Symfony/Doctrine/API Platform : privilegier `php bin/console make:*` quand MakerBundle couvre le besoin, puis adapter au contrat et aux patterns Foundation.
- Migration Doctrine si schema modifie : generer avec `php bin/console d:m:diff`, relire le SQL, adapter seulement si necessaire.
- Bridge a regenerer si contrat frontend visible change.

## Checks

- `make phpstan`
- migration via `php bin/console d:m:diff` si schema modifie
- `make bridge` si contrat expose modifie

## Documentation

Pas de documentation durable pour un endpoint standard. Mettre a jour `docs/project/` seulement si convention, contrat public structurant, securite ou architecture change.
