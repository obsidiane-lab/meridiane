# Symfony + API Platform - playbook Foundation

Reference concise pour appliquer les invariants backend du template.

## Sources prioritaires

- `AGENTS.md`
- `.codex/recipes/backend-api-resource.md`
- `.codex/patterns/backend/entity-api-resource.md`
- `.codex/patterns/backend/dto-api-resource.md`
- `.codex/patterns/backend/provider-processor.md`
- `.codex/patterns/backend/voter.md`

## Points de doctrine

- services autowires/autoconfigures, prives par defaut ;
- attributs PHP privilegies quand ils rendent la configuration plus lisible ;
- approche contract-first ; Entity Doctrine `ApiResource` seulement pour CRUD interne/backoffice simple proche du modele ;
- DTO `ApiResource` pour contrat public, stable, externe, sensible ou divergent ;
- operations API explicites si le cas n'est pas purement standard ;
- providers/processors custom seulement pour un besoin reel ;
- validation par constraints et types explicites ;
- securite choisie dans la couche la plus simple compatible avec le besoin.
- squelettes Symfony/Doctrine/API Platform generes avec `php bin/console make:*` quand MakerBundle couvre le besoin, puis adaptes aux conventions Foundation.

## Decisions rapides

### Exposition API

1. Concevoir le contrat API attendu.
2. Entity Doctrine `ApiResource` si le contrat est interne/backoffice simple et proche du modele.
3. DTO / `ApiResource` dedie si le contrat est public, stable, externe, sensible ou divergent.

### Securite

1. Gate simple pour un module globalement restreint.
2. Restriction Doctrine / couche requete pour la visibilite des donnees.
3. Voter pour une regle objet-centree, contextuelle et reutilisable.

### Etat et persistance

- schema du playground local synchronise par `make init`, sans migration heritee ;
- repositories et state providers restent fins ;
- pas de controller CRUD traditionnel si API Platform couvre deja le besoin.

## Anti-patterns

- groupes sur chaque entite par reflexe ;
- provider/processor pass-through ;
- Voter vide ;
- filtrage apres hydratation alors que Doctrine pouvait le faire ;
- correction locale du frontend pour masquer un contrat backend bancal.

## Checks

- `make phpstan`
- `make init` si le schema de cette application de test change
- `make bridge` si le contrat expose change
- documentation durable seulement si un declencheur de `AGENTS.md` est vrai
