---
name: obsidiane-upgrade-source-validation
description: "Upgrade ou source officielle Foundation: versions, API externe, OpenAI/Codex, securite ou contradiction."
---

# Upgrade et validation par sources

1. Lire `AGENTS.md`, `.codex/recipes/upgrade-source-validation.md` et
   `.codex/guides/source-validation.md`.
2. Identifier la question exacte, la version concernee et le comportement a verifier.
3. Utiliser des sources officielles recentes quand une version, API, securite ou information externe
   compte.
4. Separer faits sources, interpretation et decision projet.
5. Ne pas upgrader plusieurs familles de dependances en meme temps sans demande explicite.
6. Si un contrat API change, corriger backend/OpenAPI puis regenerer le bridge.
7. Si Angular ou frontend change, respecter `store -> repository -> service -> composant`.
8. Si Spartan change, lire `webfront/AGENTS.md`, `.agents/skills/spartan/SKILL.md` et la section CLI
   de `webfront/docs/ui/spartan.md`, puis isoler l'upgrade dans une maintenance Spartan dediee.
9. Executer exactement le workflow non destructif puis de maintenance qui y est defini ;
   relire integralement tout diff genere.
10. Executer les checks proportionnes.
11. Mettre a jour `docs/project/` si la version change une convention, un contrat applicatif ou une
    architecture durable.
