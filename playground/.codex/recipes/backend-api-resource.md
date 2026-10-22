# Recette - Backend API Platform

## Quand utiliser

Ressource, endpoint, operation, securite API, provider, processor, migration, ownership ou contrat backend.

## Lire d'abord

1. `core/AGENTS.md`
2. `.codex/patterns/backend/entity-api-resource.md` ou `.codex/patterns/backend/dto-api-resource.md`
3. `.codex/patterns/backend/ownable.md` si ressource privee par utilisateur
4. `.codex/patterns/backend/provider-processor.md` si state custom
5. `.codex/patterns/backend/voter.md` si autorisation sujet-centree
6. `core/docs/api/resources.md` seulement si le code existant ne suffit pas

## Pattern a appliquer

- Contrat API d'abord.
- Operations explicites.
- Squelette Symfony/API Platform : privilegier `php bin/console make:*` quand MakerBundle couvre le besoin, puis adapter au contrat explicite.
- Entity `ApiResource` pour CRUD interne simple.
- DTO `ApiResource` pour contrat public, stable, sensible ou divergent.
- Securite au niveau le plus simple : operation, Doctrine/extension, Voter, processor/service.
- Ressource privee par utilisateur : filtrage Doctrine Ownable comme barriere de lecture principale.
- Ressource invisible hors tenant/organisation/workspace/equipe : approche structurelle equivalente, adaptee au perimetre.
- Voter : action ou regle metier contextualisee sur une ressource deja visible dans le bon perimetre.
- Provider/processor uniquement si l'etat ou la mutation sort du comportement natif.
- Schema modifie : generer la migration avec `php bin/console d:m:diff`, relire le SQL, adapter seulement si la migration porte une transformation de donnees ou un cas non trivial.

## Checks

- `make phpstan`
- migration Doctrine via `php bin/console d:m:diff` si schema modifie
- `make bridge` si le contrat visible change

## Documentation durable seulement si

Nouvelle convention API, regle de securite reutilisable, strategie ownership, contrat public structurant ou changement d'architecture backend.
