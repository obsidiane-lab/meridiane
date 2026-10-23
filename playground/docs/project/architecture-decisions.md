# Decisions structurantes

Ce fichier porte les decisions structurantes actives du template. Il ne sert pas
de journal de bord.

## Socle agentique

Decision active : les skills visibles sont des competences de livraison, pas
des technologies.

Regles actives :

- `AGENTS.md` fixe les invariants.
- `.agents/skills/` ne contient que les skills principaux.
- `.codex/recipes/` porte les procedures de livraison.
- `.codex/patterns/` porte les formes de conception par couche.
- `.codex/guides/` porte la verification, la validation par sources et la doctrine skills/references.
- Les details techniques restent dans les recipes, patterns, `core/docs/` et
  `webfront/docs/`, pas dans des skills visibles dedies a une technologie.
