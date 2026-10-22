# Recette - Async / Messenger / Scheduler

## Quand utiliser

Traitement asynchrone, queue, batch, notification differee, import/export, tache periodique, Symfony Messenger, Symfony Scheduler ou worker backend.

## Lire d'abord

1. `AGENTS.md`
2. `core/AGENTS.md`
3. `.codex/patterns/backend/async-messenger-scheduler.md`
4. exemple : `.codex/examples/backend/async-worker/README.md` si Compose, Redis ou Scheduler change
5. le handler ou service metier le plus proche
6. la documentation officielle Symfony seulement si un detail Messenger/Scheduler est incertain

## Pattern a appliquer

- L'async Foundation utilise Redis et un ou plusieurs containers workers dedies.
- Le container HTTP (`core` en dev, `app` en prod) ne consomme pas Messenger et ne porte pas la boucle Scheduler.
- Les workers reutilisent la meme image backend avec `APP_MODE=worker`.
- Les migrations restent executees par le mode applicatif `app`, jamais par un worker.
- Les DSN Messenger par defaut vivent dans `core/.env`; Compose decrit les containers et ne duplique pas les valeurs applicatives.
- Message : DTO immutable dans `core/src/Message/`.
- Handler : `core/src/MessageHandler/`, recharge l'etat depuis la base et reste idempotent quand l'effet externe peut etre rejoue.
- Scheduler : consomme par un worker dedie ; pour une tache lourde, le Scheduler redispatch vers `async`.
- Mercure : si un handler modifie une ressource visible, produire l'evenement cote backend plutot que compenser par du polling frontend.

## Checks

- `make phpstan`
- `docker compose config` si Compose est modifie
- `docker compose up -d redis worker` ou equivalent si l'infra dev est modifiee
- `docker compose exec core php bin/console debug:messenger`
- `docker compose exec core php bin/console debug:scheduler` si Scheduler est utilise
- `docker compose exec worker php bin/console messenger:stats` si un transport async existe

## Documentation durable seulement si

Nouvelle convention worker, changement d'infrastructure async, nouvelle strategie Scheduler/Mercure hors requete HTTP ou modification du runtime `APP_MODE`.

## Anti-patterns

- Lancer `messenger:consume` dans le container HTTP.
- Executer les migrations depuis un worker.
- Faire du polling frontend pour masquer l'absence de worker ou d'evenement backend.
- Serialiser une entite Doctrine complete dans un message.
- Creer un Scheduler sans container qui consomme `scheduler_<schedule>`.
- Utiliser Scheduler pour une action immediate qui devrait etre un message Messenger dispatch au moment de l'evenement.
