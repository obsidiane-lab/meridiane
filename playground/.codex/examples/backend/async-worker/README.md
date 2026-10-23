# Exemple - Worker async

Exemple generique d'infrastructure async Foundation. Adapter les noms de transports, messages et schedules au domaine reel.

## Variables

```dotenv
###> symfony/messenger ###
MESSENGER_TRANSPORT_DSN=redis://redis:6379/messages
MESSENGER_FAILED_TRANSPORT_DSN=redis://redis:6379/failed
###< symfony/messenger ###
```

## Compose

```yaml
services:
  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  core:
    depends_on:
      redis:
        condition: service_healthy

  worker:
    <<: *core-service
    environment:
      <<: *core-env
      APP_MODE: worker
      MESSENGER_CONSUMER_NAME: "worker-async-1"
    command: ["php", "bin/console", "messenger:consume", "async", "-vv", "--time-limit=3600"]
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  redis_data:
```

## Messenger

```yaml
framework:
  messenger:
    failure_transport: failed
    transports:
      async:
        dsn: '%env(MESSENGER_TRANSPORT_DSN)%'
        options:
          consumer: '%env(MESSENGER_CONSUMER_NAME)%'
      failed:
        dsn: '%env(MESSENGER_FAILED_TRANSPORT_DSN)%'
    routing:
      App\Message\AsyncActionMessage: async
```

## Scheduler

```yaml
worker_scheduler:
  <<: *core-service
  environment:
    <<: *core-env
    APP_MODE: worker
  command: ["php", "bin/console", "messenger:consume", "scheduler_main", "-vv"]
  depends_on:
    database:
      condition: service_healthy
    redis:
      condition: service_healthy
```

```php
final class MainScheduleProvider implements ScheduleProviderInterface
{
    public function getSchedule(): Schedule
    {
        return (new Schedule())->with(
            RecurringMessage::every(
                '5 minutes',
                new RedispatchMessage(new CheckResources(), 'async'),
            ),
        );
    }
}
```

## A imiter

- Worker separe du container HTTP.
- `APP_MODE=worker` sur les workers.
- DSN dans `core/.env`.
- Messages immutables et handlers idempotents.
- Scheduler qui redispatch vers `async` pour les traitements lourds.
- Evenement Mercure produit cote backend si une ressource visible change.
