---
name: obsidiane-intervention-debug
description: "Bugfix ou diagnostic Foundation: regression, runtime, Docker, Symfony, Angular, Mercure ou Messenger."
---

# Intervention debug

1. Lire `AGENTS.md`.
2. Identifier symptome, comportement attendu et chemin d'execution.
3. Lire `.codex/recipes/bugfix-existing-code.md`.
4. Lire les fichiers appeles reellement, pas seulement les fichiers probables.
5. Reproduire ou observer le probleme si possible ; sinon expliquer le blocage.
6. Distinguer contrat API, runtime backend, base, bridge, SSE/Mercure, frontend, proxy ou
   configuration d'environnement.
7. Si le probleme touche une UI, lire `webfront/AGENTS.md` et `.agents/skills/spartan/SKILL.md`.
8. Corriger le plus petit endroit stable hors des sources generees.
9. Pour un bug UI, suivre la frontiere de correction et le workflow de maintenance du skill
   `spartan` ; ne pas creer de regle de style locale au correctif.
10. Lire `.codex/patterns/architecture/pattern-choice.md` seulement si le refactor revele une odeur
    durable.
11. Ajouter ou adapter un check couvrant la regression quand c'est proportionne.
12. En sortie, indiquer diagnostic retenu, correctif, checks executes et limites non prouvees.
