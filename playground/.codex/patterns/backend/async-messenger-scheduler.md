# Pattern - Async Messenger Scheduler

## Utilise quand

Queue, batch, import/export, notification differee, tache periodique, worker Symfony Messenger ou Symfony Scheduler.

## Architecture

- Redis est le transport async standard.
- Le container HTTP sert les requetes, expose Mercure, execute les migrations en mode `app`, puis reste dedie au trafic web.
- Un worker est un service separe qui reutilise la meme image backend avec `APP_MODE=worker`.
- `APP_MODE=worker` attend la base, mais ne genere pas la runtime config front et ne lance pas les migrations.
- En prod, garder le meme principe : un service HTTP et un service worker separes, meme image, `APP_MODE=worker` sur le worker.

## Environnement

- Definir les DSN Messenger par defaut dans `core/.env`.
- Ne pas dupliquer les DSN applicatifs dans `compose.yaml` : Compose decrit les containers, le `.env` Symfony porte les valeurs applicatives.
- `MESSENGER_CONSUMER_NAME` peut rester dans la definition du worker si plusieurs consumers Redis tournent en parallele.

## Messenger

- Installer seulement les composants necessaires : Messenger, transport Redis et Scheduler si besoin.
- Ajouter l'extension PHP Redis dans l'image quand le transport Redis est utilise.
- Router explicitement les messages asynchrones ; ne pas router tout un namespace par reflexe.
- Message : DTO immutable dans `core/src/Message/`.
- Handler : `core/src/MessageHandler/`, avec `#[AsMessageHandler]`.
- Le controleur, processor ou service dispatch seulement le message.
- Le handler recharge l'etat necessaire depuis la base ; il ne depend pas d'une entite Doctrine serialisee.
- Le handler est idempotent ou protege contre les doublons quand l'action a un effet externe.
- Les erreurs temporaires utilisent les retries Messenger ; les erreurs metier doivent etre explicites et loggees.

## Scheduler

- Le Scheduler est consomme par un worker, jamais par le container HTTP.
- Le nom du transport Scheduler est `scheduler_<nom_du_schedule>`.
- Prevoir un seul worker par schedule par defaut.
- Si plusieurs workers consomment le meme schedule, ajouter un lock Symfony au schedule.
- Pour une tache periodique lourde ou partagee avec l'async, le Scheduler doit seulement declencher un message redispatch vers `async`.

## Mercure

Un handler async ou Scheduler peut modifier une ressource Doctrine exposee par API Platform. Si la publication Mercure automatique ne couvre pas le chemin hors requete HTTP, publier explicitement un `Update` Mercure dans un service metier.

Ne pas ajouter de polling Angular pour compenser un worker absent. Le frontend s'abonne a Mercure ; le backend decide quand produire l'evenement.

## Checks

`make phpstan`; `docker compose config` si Compose ; `debug:messenger`; `debug:scheduler` si Scheduler ; `messenger:stats` si transport async.

## Anti-patterns

Worker dans le container HTTP, migration executee depuis un worker, entite Doctrine serialisee dans un message, routing Messenger trop large, Scheduler sans consumer, polling frontend pour masquer une absence d'evenement backend.
