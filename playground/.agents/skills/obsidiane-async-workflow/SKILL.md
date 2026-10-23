---
name: obsidiane-async-workflow
description: "Async Foundation: Messenger, Scheduler, queue, worker, batch, import/export ou effet hors requete."
---

# Async workflow

1. Lire `AGENTS.md`.
2. Lire `core/AGENTS.md`.
3. Lire `.codex/recipes/async-worker.md`.
4. Lire `.codex/patterns/backend/async-messenger-scheduler.md`.
5. Classifier : effet differe -> Messenger ; tache planifiee -> Scheduler ; exploitation -> worker runtime.
6. Ne pas rendre async une action HTTP simple sans benefice concret.
7. Message : DTO immutable ; handler : recharge l'etat depuis la base.
8. Garantir idempotence ou tolerance aux retries quand un effet externe peut etre rejoue.
9. Ne pas consommer Messenger ni Scheduler dans le container HTTP.
10. Publier un evenement backend si un handler modifie une ressource visible.
11. Executer `make phpstan`, puis checks Docker/Symfony proportionnes si runtime async change.
