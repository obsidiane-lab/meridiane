# Recette - Bridge et contrat API

## Quand utiliser

Erreur de typing bridge, nouveau champ expose, operation API visible, OpenAPI generee, `webfront/bridge/`, Meridiane ou contrat frontend/backend.

## Lire d'abord

1. `.codex/patterns/bridge/contract-generation.md`
2. `core/AGENTS.md` si backend change
3. `webfront/AGENTS.md` si usage frontend change
4. `webfront/docs/data/bridge.md` seulement si le diagnostic est ambigu

## Pattern a appliquer

1. Corriger le contrat backend.
2. Verifier l'OpenAPI generee si possible.
3. Lancer `make bridge`.
4. Adapter repository, service et composant.
5. Ne jamais patcher `webfront/bridge/`.

## Checks

- `make bridge`
- `make build`
- `make phpstan` si backend modifie

## Documentation durable seulement si

Strategie de generation change, nouveau contrat public structurant, changement Meridiane ou regle durable de mapping.
