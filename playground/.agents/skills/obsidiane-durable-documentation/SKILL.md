---
name: obsidiane-durable-documentation
description: "Documentation durable Foundation: convention, architecture, contrat public, securite ou connaissance reutilisable."
---

# Documentation durable

Utiliser quand l'utilisateur demande de la documentation ou quand le diff change une convention, architecture, contrat public, securite ou connaissance metier reutilisable.

Lire `AGENTS.md`, `.codex/recipes/durable-documentation.md`, `docs/project/durable-memory-policy.md`, puis le document durable existant le plus proche.

Appliquer : mettre a jour le document existant le plus proche, fusionner ou supprimer la doc obsolete, et garder le texte court, actionnable, en francais.

Ne pas creer d'ADR pour une micro-decision. Utiliser `docs/project/architecture-decisions.md` seulement pour une decision structurante, transverse, couteuse a inverser ou controversee.

Si la modification ne justifie pas de documentation durable, ne pas creer de fichier et indiquer en sortie : `Documentation durable : non necessaire`.

Finir par verifier les liens internes Markdown et la coherence avec `AGENTS.md`, recettes et patterns touches.
