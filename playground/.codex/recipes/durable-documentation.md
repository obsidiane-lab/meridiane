# Recette - Documentation durable explicite

## Quand utiliser

L'utilisateur demande de la documentation, ou le diff change une convention, architecture, contrat public, securite ou connaissance metier reutilisable.

## Lire d'abord

1. `docs/project/durable-memory-policy.md`
2. le document durable concerne
3. `.codex/guides/source-validation.md` si une source officielle est necessaire

## Pattern a appliquer

- Mettre a jour le document existant le plus proche.
- Ne pas creer de fiche si une entree courte dans `docs/project/product-map.md` suffit.
- Utiliser `docs/project/architecture-decisions.md` uniquement pour une decision structurante.
- Supprimer ou fusionner la doc obsolete.
- Garder le texte court, actionnable et oriente reutilisation future.

## Checks

- liens internes Markdown
- coherence avec `AGENTS.md` et les recettes
