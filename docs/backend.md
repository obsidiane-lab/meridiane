# Backend : configuration de référence

Cette page part des configurations officielles et indique, fichier par fichier, ce qu'il faut changer pour Meridiane :

- **FrankenPHP** : le projet [Symfony Docker](https://github.com/dunglas/symfony-docker), qui sert Symfony et intègre le hub Mercure ;
- **Mercure 1.x** : le bloc `issuer` du [Caddyfile officiel du hub](https://github.com/dunglas/mercure/blob/main/Caddyfile) ;
- **Symfony et API Platform** : les recettes Flex de `symfony/mercure-bundle` et `api-platform/symfony`.

Elle suppose une approche entité (des entités Doctrine `#[ApiResource]`, sans groupes de sérialisation) et une seule origine pour le front, l'API et le hub.

## Architecture

FrankenPHP sert les trois sur le même domaine :

```text
https://app.example.com/                       → front Angular
https://app.example.com/api/…                  → API Platform
https://app.example.com/.well-known/mercure    → hub Mercure
```

Une seule origine, c'est la condition pour que le cookie d'abonnement Mercure fonctionne sans CORS ni `withCredentials` : le navigateur l'envoie au hub comme n'importe quel cookie de l'application.

Les exemples utilisent l'organisation de l'installeur d'API Platform, avec l'API et le front côte à côte :

```text
mon-projet/
├── api/      projet Symfony Docker : compose.yaml, Dockerfile, frankenphp/, config/, src/
└── front/    application Angular : angular.json, src/, bridge/
```

## Versions

| Élément | Version |
|---|---|
| PHP | 8.5 |
| Symfony | 8.1 |
| API Platform | 5.0 |
| Doctrine | ORM 3.7, DBAL 4.5, DoctrineBundle 3.3 |
| symfony/mercure-bundle | 0.6 (protocole Mercure 1.0 par défaut) |
| symfony/mercure | 0.9 |
| FrankenPHP | 1.13 (hub Mercure 1.1) |
| Angular | 22.2 |

## Installer

Dans le projet Symfony Docker (`api/`), une fois la stack démarrée :

```bash
docker compose exec php composer require api-platform/symfony api-platform/doctrine-orm symfony/mercure-bundle
```

Les recettes Flex créent `config/packages/api_platform.yaml`, `config/routes/api_platform.yaml` et `config/packages/mercure.yaml`. Symfony Docker intègre déjà le hub : la recette Mercure n'ajoute pas de service Docker.

## FrankenPHP et hub Mercure

### `frankenphp/Caddyfile`

Le Caddyfile de Symfony Docker, avec deux changements : le bloc `mercure` passe à la syntaxe de Mercure 1.x, et une route envoie les pages du front vers Angular.

```caddyfile
{
	skip_install_trust

	{$CADDY_GLOBAL_OPTIONS}

	frankenphp {
		{$FRANKENPHP_CONFIG}
	}
}

{$CADDY_EXTRA_CONFIG}

{$SERVER_NAME:localhost} {
	log {
		{$CADDY_SERVER_LOG_OPTIONS}
	}

	root /app/public
	encode zstd br gzip

	# Hub Mercure 1.x : même émetteur et même clé que symfony/mercure-bundle.
	mercure {
		issuer {$MERCURE_JWT_ISSUER} {
			publisher {
				jwt {env.MERCURE_JWT_SECRET}
			}
			subscriber {
				jwt {env.MERCURE_JWT_SECRET}
			}
		}
		{$MERCURE_EXTRA_DIRECTIVES}
	}

	vulcain

	{$CADDY_SERVER_EXTRA_DIRECTIVES}

	# Front Angular : tout ce qui n'est ni l'API, ni le hub, ni un outil de Symfony.
	@front not path /api /api/* /.well-known/mercure* /bundles/* /_profiler* /_wdt* /_error*
	handle @front {
		import front.caddy
	}

	# Symfony : le routage de Symfony Docker, inchangé.
	handle {
		@phpRoute {
			not path /.well-known/mercure*
			not file {path}
		}
		rewrite @phpRoute index.php

		@frontController path index.php
		php @frontController {
			{$FRANKENPHP_SITE_CONFIG}

			worker {
				file ./public/index.php
				{$FRANKENPHP_WORKER_CONFIG}
			}
		}

		file_server {
			hide *.php
		}
	}
}
```

**Le hub.**

- `issuer` : le hub accepte les tokens signés par symfony/mercure-bundle, qui partagent cet émetteur et cette clé. C'est la forme attendue par Mercure 1.x.
- `{$MERCURE_EXTRA_DIRECTIVES}` : les directives propres à un environnement, `cookie_name` en développement et `resource_identifier` derrière un proxy TLS.
- Retirés de Symfony Docker :
  - `publisher_jwt` et `subscriber_jwt`, qui ne fonctionnent plus qu'en mode de compatibilité ;
  - `anonymous`, car le bridge s'abonne avec un cookie ;
  - `subscriptions`, dont le bridge ne se sert pas ;
  - le filtre de logs sur `authorization`, un paramètre qui n'existe plus en Mercure 1.0.
- Historique : le transport par défaut (Bolt, dans le volume `caddy_data`) conserve les événements. Le hub peut ainsi rejouer ceux qu'un navigateur a manqués pendant une coupure.

**Le front.** La route `@front` délègue au fichier `front.caddy`, qui change selon l'environnement :

```caddyfile
# frankenphp/front.dev.caddy : le serveur de développement Angular (rechargement à chaud compris)
reverse_proxy front:4200
```

```caddyfile
# frankenphp/front.prod.caddy : le build Angular copié dans l'image
root /app/front
try_files {path} /index.html
file_server
```

`try_files` renvoie `index.html` pour toute URL qui n'est pas un fichier : le routeur Angular prend le relais.

## Docker Compose

Symfony et le hub lisent les mêmes variables : un émetteur et une clé, déclarés une seule fois.

| Variable | Lue par | Valeur |
|---|---|---|
| `SERVER_NAME` | Caddy | le domaine public, et `php:80` pour que Symfony publie en interne |
| `DEFAULT_URI` | Symfony (routeur) | `https://app.example.com` |
| `MERCURE_URL` | Symfony (publication) | `http://php/.well-known/mercure` |
| `MERCURE_PUBLIC_URL` | Symfony (cookie) | `https://app.example.com/.well-known/mercure` |
| `MERCURE_JWT_SECRET` | Symfony et hub | le secret qui signe les tokens |
| `MERCURE_JWT_ISSUER` | Symfony et hub | `https://app.example.com` |

### `compose.yaml`

```yaml
services:
  php:
    environment:
      SERVER_NAME: ${SERVER_NAME:-localhost}, php:80
      DEFAULT_URI: https://${SERVER_NAME:-localhost}
      DATABASE_URL: # inchangée
      MERCURE_URL: ${CADDY_MERCURE_URL:-http://php/.well-known/mercure}
      MERCURE_PUBLIC_URL: ${CADDY_MERCURE_PUBLIC_URL:-https://${SERVER_NAME:-localhost}/.well-known/mercure}
      MERCURE_JWT_SECRET: ${CADDY_MERCURE_JWT_SECRET:-!ChangeThisMercureHubJWTSecretKey!}
      MERCURE_JWT_ISSUER: https://${SERVER_NAME:-localhost}
```

Par rapport à Symfony Docker :

- `MERCURE_PUBLISHER_JWT_KEY` et `MERCURE_SUBSCRIBER_JWT_KEY` disparaissent : le hub lit `MERCURE_JWT_SECRET`, comme Symfony ;
- `MERCURE_JWT_ISSUER` est ajoutée ;
- `DEFAULT_URI` et `MERCURE_PUBLIC_URL` perdent le port `:443`.

Les URL publiques doivent être exactement celles qu'utilise le navigateur. Il n'envoie jamais `:443`, or le hub compare l'URL du cookie à la lettre : avec ce port, il refuse le cookie (401). Gardez le port seulement s'il n'est pas 443.

### `compose.override.yaml` (développement)

```yaml
services:
  php:
    volumes:
      # À ajouter aux volumes existants.
      - ./frankenphp/front.dev.caddy:/etc/frankenphp/front.caddy:ro
    environment:
      # Remplace `demo`, qui n'existe plus en Mercure 1.x.
      MERCURE_EXTRA_DIRECTIVES: cookie_name mercure_access_token

  front:
    image: node:24
    working_dir: /app
    volumes:
      - ../front:/app
    command: sh -c "npm install && npx ng serve --host 0.0.0.0"
```

- **`cookie_name`** : en mode debug, le bundle nomme le cookie `mercure_access_token`, et le hub doit lire le même nom. En production, les deux utilisent `__Secure-mercure_access_token`.
- **`front`** : `ng serve` écoute sur le port 4200 du réseau Docker. Le navigateur passe toujours par `https://localhost`, jamais par le port 4200.

### `compose.prod.yaml` (production)

```yaml
services:
  php:
    build:
      additional_contexts:
        front: ../front
    environment:
      APP_SECRET: ${APP_SECRET}
      # Remplace MERCURE_PUBLISHER_JWT_KEY et MERCURE_SUBSCRIBER_JWT_KEY.
      MERCURE_JWT_SECRET: ${CADDY_MERCURE_JWT_SECRET}
```

`CADDY_MERCURE_JWT_SECRET` doit être une clé aléatoire : le hub signale la clé de développement au démarrage.

### `Dockerfile` (production)

Le front est compilé dans une étape dédiée, puis copié dans l'image finale avec `front.prod.caddy` :

```dockerfile
# Nouvelle étape, avant frankenphp_prod
FROM node:24 AS front_build
WORKDIR /front
COPY --from=front package.json package-lock.json ./
RUN npm ci
COPY --from=front . ./
RUN npx ng build

# Dans l'étape frankenphp_prod, après la copie du Caddyfile
COPY --link frankenphp/front.prod.caddy /etc/frankenphp/front.caddy
COPY --link --from=front_build /front/dist/front/browser /app/front
```

`dist/front/browser` correspond à un projet Angular nommé `front` (`angular.json`). Ajoutez un `front/.dockerignore` pour ne pas copier les fichiers locaux :

```text
node_modules
dist
.angular
```

## Symfony

### Mercure

Le fichier créé par la recette convient tel quel :

```yaml
# config/packages/mercure.yaml
mercure:
    hubs:
        default:
            url: '%env(default::MERCURE_URL)%'
            public_url: '%env(default::MERCURE_PUBLIC_URL)%'
            jwt:
                secret: '%env(MERCURE_JWT_SECRET)%'
                publish: '*'
                claims:
                    iss: '%env(MERCURE_JWT_ISSUER)%'
                    sub: 'app'
                    client_id: 'app'
```

- `url` sert à publier depuis PHP, par le réseau Docker.
- `public_url` est l'URL que le navigateur appelle : le cookie est limité à son chemin, et le hub vérifie que le token lui est destiné.
- Le protocole Mercure 1.0 est le défaut du bundle 0.6 : `protocol_version` est inutile.

### Routeur

La recette `symfony/routing` configure déjà `framework.router.default_uri: '%env(DEFAULT_URI)%'`. API Platform publie chaque update sur l'URL absolue de l'item. Pendant une requête HTTP, il prend l'hôte de la requête. Dans une commande ou un worker Messenger, sans requête, il prend `DEFAULT_URI`, qui doit donc être l'origine du front.

## API Platform

### Configuration

Le fichier créé par la recette convient tel quel :

```yaml
# config/packages/api_platform.yaml
api_platform:
    title: Hello API Platform
    version: 1.0.0
    defaults:
        stateless: true
        cache_headers:
            vary: ['Content-Type', 'Authorization', 'Origin']
```

Le bridge repose sur les valeurs par défaut d'API Platform. Ne les modifiez pas :

| Option | Défaut | Utilisé par le bridge |
|---|---|---|
| `formats` | JSON-LD seul | requêtes, réponses et updates Mercure en JSON-LD |
| `patch_formats` | `application/merge-patch+json` | `patch$()` |
| `docs_formats` | dont `jsonopenapi` | le contrat lu par le CLI : `/api/docs.jsonopenapi` |
| `serializer.hydra_prefix` | `false` | `member`, `totalItems`, `view` |
| noms de pagination | `page`, `itemsPerPage` | `getCollection$({page, itemsPerPage})` |
| `url_generation_strategy` | non définie | `@id` relatifs, topics Mercure absolus |

Pour que le front choisisse la taille des pages, ajoutez `pagination_client_items_per_page: true` dans `defaults`.

### Ressources

```php
use ApiPlatform\Metadata\ApiResource;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[ApiResource(mercure: true)]   // ou mercure: ['private' => true] : seulement pour les abonnés autorisés
class Project
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    private string $name = '';

    #[ORM\ManyToOne]
    private ?Organization $organization = null;   // exposée en IRI : "/api/organizations/3"

    // getters et setters
}
```

Les opérations par défaut d'API Platform 5 sont `Get`, `GetCollection`, `Post`, `Patch` et `Delete`. À chaque flush Doctrine qui touche l'entité, que ce soit dans une requête HTTP, une commande ou un worker, API Platform publie :

| Événement | Topic | Payload |
|---|---|---|
| création, modification | URL de l'item : `https://app.example.com/api/projects/42` | l'entité en JSON-LD, identique au GET de l'item |
| suppression | même topic | `{"@id": "/api/projects/42"}` |

Règles :

- **Pas de groupes de sérialisation.** Le payload reste celui du GET, et le store le remplace tel quel.
- **Opérations et URI par défaut.** L'IRI d'un item reste `/api/projects/{id}`, celle qu'écoute `watch$()`.
- **Seule option Mercure : `private`.** `topics`, `data`, `type` et `normalization_context` changent le topic, le payload ou le nom de l'événement que lit le bridge.

**Données liées.** API Platform ne publie que l'entité modifiée. Créer une tâche ne republie pas son projet, même si le projet liste ses tâches. Écoutez la ressource enfant côté front ([recette](recettes.md#afficher-les-éléments-liés)), ou publiez le parent depuis un state processor.

**Messenger.** Si symfony/messenger est installé, les updates passent par le bus. Elles sont publiées immédiatement, sauf si vous routez `Symfony\Component\Mercure\Update` vers un transport asynchrone : il faut alors qu'un worker tourne.

## Autoriser les abonnés

Le bridge appelle l'endpoint déclaré dans `mercure.authorize`. Cet endpoint pose le cookie avec le service `Authorization` du bundle, comme dans la [doc Symfony](https://symfony.com/doc/current/mercure.html#programmatically-setting-the-cookie). Les droits du cookie reflètent **ce que l'utilisateur peut lire** : le hub ne livre une update privée qu'aux tokens dont un droit couvre son topic.

```php
// src/Controller/MercureAuthorizationController.php
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mercure\Authorization;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class MercureAuthorizationController extends AbstractController
{
    private const TTL = 600;

    #[Route('/api/mercure/authorization', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function __invoke(Request $request, Authorization $authorization): JsonResponse
    {
        $base = $request->getSchemeAndHttpHost();

        $authorization->setCookie(
            $request,
            ['urlpattern' => [$base.'/api/projects/:id', $base.'/api/tasks/:id']],   // ce que l'utilisateur peut lire
            null,
            ['exp' => new \DateTimeImmutable(sprintf('+%d seconds', self::TTL))],
        );

        // expiresIn : le bridge renouvelle le cookie 5 secondes avant son expiration.
        return $this->json(['expiresIn' => self::TTL], headers: ['Cache-Control' => 'no-store, private']);
    }
}
```

- **Droits** : `['urlpattern' => [...]]`, `['exact' => [...]]`, ou les deux. Les topics sont des URL absolues, comme celles que publie API Platform.
- **Durée courte, et `expiresIn` égal à `exp`.** Le hub ferme chaque connexion avant l'expiration de son token, et le navigateur se reconnecte seul. Le bridge renouvelle le cookie juste avant : chaque reconnexion part avec un token valide et reprend les événements manqués.
- **Utilisateur non connecté** : l'endpoint répond 401, et le bridge réessaie plus tard. Si votre front redirige vers le login sur une 401, excluez cette URL. Pour des données publiques, remplacez `IS_AUTHENTICATED_FULLY` par `PUBLIC_ACCESS`.
- **Logout** : appelez `$authorization->clearCookie($request)` dans l'action de déconnexion.

## Derrière un proxy TLS

Si un proxy ou votre hébergeur termine le TLS avant FrankenPHP (`SERVER_NAME: :80`), ajoutez deux réglages :

```yaml
# compose.prod.yaml, service php
MERCURE_EXTRA_DIRECTIVES: resource_identifier https://app.example.com/.well-known/mercure
```

```yaml
# config/packages/framework.yaml
when@prod:
    framework:
        trusted_proxies: '%env(TRUSTED_PROXIES)%'
        trusted_headers: ['x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host', 'x-forwarded-port', 'x-forwarded-prefix']
```

- **`resource_identifier`** : le hub vérifie que chaque token lui est destiné. Sans ce réglage, il déduit l'URL attendue de la requête et y voit `http://` au lieu de `https://`, si bien qu'il refuse le cookie (401).
- **`trusted_proxies`** : Symfony garde `https://app.example.com` pour construire les topics et les droits du cookie.

## Vérifier

Avec une session valide :

```bash
# 1. Autorisation : 200, {"expiresIn":600}
#    et Set-Cookie: __Secure-mercure_access_token=…; path=/.well-known/mercure; httponly; samesite=strict
curl -i -b 'PHPSESSID=…' https://app.example.com/api/mercure/authorization

# 2. Abonnement : 200 avec Content-Type: text/event-stream ; 401 sans cookie
curl -N -b '__Secure-mercure_access_token=…' \
  'https://app.example.com/.well-known/mercure?match_urlpattern=https://app.example.com/api/projects/:id'
```

Modifiez puis supprimez un projet pendant que la commande 2 tourne. Le flux affiche :

```text
id: urn:uuid:…
data: {"@context":"/api/contexts/Project","@id":"/api/projects/42","@type":"Project",…}

id: urn:uuid:…
data: {"@id":"/api/projects/42"}
```

Si rien n'arrive, comparez le topic écouté avec l'URL de l'item : ils doivent avoir le même schéma, le même hôte et le même port ([Dépannage](depannage.md#temps-réel)).

## Hors de la configuration de référence

| Choix | Conséquence pour le bridge |
|---|---|
| Groupes de sérialisation | Le payload Mercure peut différer du GET, et les écritures sont typées avec le modèle de lecture. |
| Ressource DTO (`stateOptions`) ou `output:` | API Platform ne publie rien automatiquement, ou publie un payload différent du GET. |
| `uriTemplate` personnalisé sur l'item | L'IRI n'est plus `{collection}/{id}` : déclarer `topic` dans `FacadeFactory.create()`. |
| Options Mercure `topics`, `data`, `type` | Écouter avec `BridgeFacade.watch$()` et traiter le format soi-même ; un événement `type` n'est pas reçu. |
| Front et API sur deux domaines | Voir [Configuration Angular](configuration.md#api-sur-un-autre-domaine). |

### Publier sur un topic personnalisé

Pour des notifications par utilisateur, publiez vous-même sur une URL absolue de la même origine :

```php
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;

final class NotificationPublisher
{
    public function __construct(
        private readonly HubInterface $hub,
        #[Autowire(env: 'DEFAULT_URI')] private readonly string $baseUri,
    ) {
    }

    public function publish(User $user, array $notification): void
    {
        $this->hub->publish(new Update(
            sprintf('%s/users/%d/notifications', $this->baseUri, $user->getId()),
            json_encode($notification, \JSON_THROW_ON_ERROR),
            private: true,
        ));
    }
}
```

Ajoutez ce topic aux droits du cookie (`'exact' => [$base.'/users/'.$user->getId().'/notifications']`). Côté front : `bridge.watch$({match: '/users/42/notifications'})` ([Temps réel](temps-reel.md#écouter-un-topic-qui-nest-pas-une-iri-ditem)).
