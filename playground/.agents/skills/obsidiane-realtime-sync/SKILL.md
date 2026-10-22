---
name: obsidiane-realtime-sync
description: "Realtime Foundation: Mercure, SSE, topics, watch$, watchCollection$, store live ou publication backend."
---

# Realtime sync

1. Lire `AGENTS.md`.
2. Lire `.codex/recipes/sse-mercure.md` et `.codex/patterns/realtime/sse-mercure.md`.
3. Lire `.codex/patterns/frontend/entity-resource-signal.md` si une entite par IRI est affichee.
4. Lire `webfront/AGENTS.md` et `.agents/skills/spartan/SKILL.md` si une surface visible change.
5. Distinguer item topic, collection topic, rafraichissement de liste, detail/edit live ou publication
   backend.
6. Backend : declarer les topics Mercure quand API Platform suffit.
7. Repository : exposer `watch$` ou `watchCollection$` et synchroniser le store par IRI.
8. Composant : garder les abonnements bornes et rafraichir seulement la composition de liste
   concernee ; appliquer le skill `spartan` pour son rendu visible.
9. Ne pas masquer l'absence d'evenement backend par du polling frontend.
10. Executer `make phpstan` si backend touche, `make lint && make build` si frontend touche, puis une
    verification manuelle ou automatisable du flux si possible.
