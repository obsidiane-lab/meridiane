---
name: obsidiane-feature-delivery
description: "Feature metier Foundation transverse: cadrage, API, Angular, persistance, securite, realtime ou async."
---

# Feature delivery

1. Lire `AGENTS.md`.
2. Lire `.codex/recipes/feature-delivery.md`.
3. Identifier objectif utilisateur, acteurs, donnees, operations, ecrans, permissions, contrat API, effets de bord et `done when`.
4. Demander une clarification courte seulement si une hypothese raisonnable serait risquee.
5. Si la demande est simple, router vers le skill specialise pertinent : webapp, backend API, frontend UX, contrat, realtime, async, securite ou documentation.
6. Si une odeur de conception concrete apparait, lire `.codex/patterns/architecture/pattern-choice.md` et choisir le pattern Foundation le plus simple.
7. Ordonner le diff : modele -> migration -> securite backend -> contrat API -> bridge -> store/repository/service -> composition UI Angular avec Spartan -> realtime/async -> docs si necessaire.
8. Utiliser les generateurs natifs quand ils couvrent le besoin : `php bin/console make:*`, `php bin/console d:m:diff`, `ng generate`, puis `make bridge` si contrat visible change.
9. Si une UI est livree, appliquer `webfront/AGENTS.md` et `.agents/skills/spartan/SKILL.md` comme
   doctrine UI unique, sans en recopier les regles dans la feature.
10. Ne pas ajouter endpoint public, auth, worker, realtime ou documentation durable sans besoin explicite ou consequence directe de la feature.
11. Executer les checks proportionnes aux surfaces touchees.
12. En sortie, indiquer le decoupage retenu, le pattern choisi si applicable, les commandes natives lancees ou ignorees avec raison, les checks executes et le statut documentation durable.
