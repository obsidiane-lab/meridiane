# Backend : configuration de référence

Le bridge s'appuie sur les configurations officielles, sans réglage maison :

- **FrankenPHP** : le projet [Symfony Docker](https://github.com/dunglas/symfony-docker), qui sert l'application et intègre le hub Mercure ;
- **Mercure 1.x** : le bloc `issuer` du [Caddyfile officiel du hub](https://github.com/dunglas/mercure/blob/main/Caddyfile) ;
- **Symfony et API Platform** : les recettes Flex de `symfony/mercure-bundle` et `api-platform/symfony`.

Le bridge n'ajoute qu'un endpoint : celui qui pose le cookie d'abonnement Mercure. Cette configuration est celle du [playground](../playground/README.md), où elle est vérifiée de bout en bout.

Elle suppose une approche entité (des entités Doctrine `#[ApiResource]`, sans groupes de sérialisation) et un seul domaine pour le front, l'API et le hub.

## Versions

Les dernières versions stables, validées ensemble dans le playground :

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

Dans un projet Symfony Docker :

```bash
composer require api-platform/symfony api-platform/doctrine-orm symfony/mercure-bundle
```

Les recettes Flex créent `config/packages/api_platform.yaml`, `config/routes/api_platform.yaml` et `config/packages/mercure.yaml`.

## Variables d'environnement

Symfony et le hub lisent les mêmes variables : un émetteur et une clé, déclarés une seule fois.

| Variable | Lue par | Production |
|---|---|---|
| `SERVER_NAME` | Caddy | `app.example.com, php:80` : le domaine public, et `php:80` pour que Symfony publie en interne |
| `DEFAULT_URI` | Symfony (routeur) | `https://app.example.com` |
| `MERCURE_URL` | Symfony (publication) | `http://php/.well-known/mercure` |
| `MERCURE_PUBLIC_URL` | Symfony (cookie), navigateur | `https://app.example.com/.well-known/mercure` |
| `MERCURE_JWT_SECRET` | Symfony et hub | le secret qui signe les tokens |
| `MERCURE_JWT_ISSUER` | Symfony et hub | `https://app.example.com` |

Le `compose.yaml` de Symfony Docker définit déjà les cinq premières dans le service `php`. Deux changements :

```yaml
# compose.yaml, service php
environment:
  # Sans le port 443 : le hub compare l'URL exacte, et le navigateur ne l'envoie pas.
  MERCURE_PUBLIC_URL: https://${SERVER_NAME:-localhost}/.well-known/mercure
  # L'émetteur, lu aussi par le hub dans l'environnement du conteneur.
  MERCURE_JWT_ISSUER: https://${SERVER_NAME:-localhost}
```

`MERCURE_PUBLIC_URL` doit être l'URL exacte que le navigateur appelle. Avec `:443`, la valeur par défaut de Symfony Docker, le hub refuse le cookie (401). Gardez le port seulement s'il n'est pas 443.

## Hub Mercure

Dans `frankenphp/Caddyfile`, remplacez le bloc `mercure` de Symfony Docker, encore écrit pour Mercure 0.x, par celui du Caddyfile officiel du hub :

```caddyfile
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
```

- **`issuer`** : le hub accepte les tokens que signe symfony/mercure-bundle, qui partagent le même émetteur et la même clé. C'est la forme exigée par Mercure 1.x.
- **Directives 0.x** : `publisher_jwt` et `subscriber_jwt` ne fonctionnent plus qu'en mode compatibilité, et `demo` n'existe plus. `anonymous` et `subscriptions` ne servent pas au bridge.
- **Historique** : le transport par défaut (Bolt, dans le volume `caddy_data`) conserve l'historique, ce qui permet au hub de rejouer les événements manqués après une coupure.

**En développement**, dans `compose.override.yaml`, remplacez `MERCURE_EXTRA_DIRECTIVES: demo` par :

```yaml
MERCURE_EXTRA_DIRECTIVES: cookie_name mercure_access_token
```

En mode debug, le bundle nomme le cookie `mercure_access_token`, et le hub doit lire le même nom. En production, les deux utilisent `__Secure-mercure_access_token`.

## symfony/mercure-bundle

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

- `url` sert à publier depuis PHP, et `public_url` est l'URL que le navigateur utilise réellement : le cookie est limité à son chemin, et le hub vérifie que le token lui est destiné.
- Le protocole Mercure 1.0 est le défaut du bundle 0.6 : `protocol_version` est inutile.

## API Platform

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
| `serializer.hydra_prefix` | `false` | `member`, `totalItems`, `view` |
| noms de pagination | `page`, `itemsPerPage` | `getCollection$({page, itemsPerPage})` |
| `url_generation_strategy` | non définie | `@id` relatifs, topics Mercure absolus |

Si le front choisit la taille des pages, ajoutez `pagination_client_items_per_page: true` dans `defaults`.

## Symfony

La recette `symfony/routing` configure déjà `default_uri: '%env(DEFAULT_URI)%'`. API Platform publie chaque update sur l'URL absolue de l'item. Dans une commande ou un worker, qui n'ont pas de requête HTTP, c'est `DEFAULT_URI` qui fournit cet hôte : il doit être celui du front.

## Ressources

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

À chaque flush Doctrine qui touche l'entité (requête HTTP, commande ou worker), API Platform publie :

| Événement | Topic | Payload |
|---|---|---|
| création, modification | URL de l'item : `https://app.example.com/api/projects/42` | l'entité en JSON-LD, identique au GET de l'item |
| suppression | même topic | `{"@id": "/api/projects/42"}` |

Règles :

- **Pas de groupes de sérialisation.** Le payload reste celui du GET, et le store le remplace tel quel.
- **Opérations et URI par défaut.** L'IRI d'un item reste `/api/projects/{id}`, celle qu'écoute `watch$()`.
- **Seule option Mercure : `private`.** `topics`, `data`, `type` et `normalization_context` changent le topic, le payload ou le nom de l'événement que lit le bridge.

**Données liées.** API Platform ne publie que l'entité modifiée. Créer une tâche ne republie pas son projet, même si le projet liste ses tâches. Écoutez la ressource enfant côté front ([recette](recettes.md#afficher-les-éléments-liés)), ou publiez le parent depuis un state processor.

**Messenger.** Si symfony/messenger est installé, les updates passent par le bus : elles sont publiées immédiatement, sauf si vous routez `Symfony\Component\Mercure\Update` vers un transport asynchrone, auquel cas un worker doit tourner.

## Autoriser les abonnés

Le bridge appelle l'endpoint déclaré dans `mercure.authorize`. Celui-ci pose le cookie avec le service `Authorization` du bundle, comme dans la [doc Symfony](https://symfony.com/doc/current/mercure.html#programmatically-setting-the-cookie). Ses droits reflètent **ce que l'utilisateur peut lire** : le hub ne livre une update privée qu'aux tokens dont un droit couvre son topic.

```php
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
        $authorization->setCookie(
            $request,
            ['urlpattern' => [$request->getSchemeAndHttpHost().'/api/projects/:id']],   // ce que l'utilisateur peut lire
            null,
            ['exp' => new \DateTimeImmutable(sprintf('+%d seconds', self::TTL))],
        );

        // expiresIn : le bridge renouvelle le cookie 5 secondes avant son expiration.
        return $this->json(['expiresIn' => self::TTL], headers: ['Cache-Control' => 'no-store, private']);
    }
}
```

- **Droits** : un tableau `['urlpattern' => [...]]`, `['exact' => [...]]`, ou les deux. Les topics sont des URL absolues, comme celles qu'API Platform publie.
- **Durée courte, et `expiresIn` égal à `exp`.** Le hub ferme chaque connexion avant l'expiration de son token, et le navigateur se reconnecte seul. Le bridge renouvelle le cookie juste avant : les reconnexions partent toujours avec un token valide et reprennent avec `Last-Event-ID`.
- **Utilisateur non connecté** : l'endpoint répond 401 et le bridge réessaie plus tard. Votre intercepteur 401 global doit ignorer cette URL.
- **Logout** : `$authorization->clearCookie($request)` dans l'action de déconnexion.

## Front

```ts
provideBridge({
  baseUrl: '/',
  mercure: {hubUrl: '/.well-known/mercure', authorize: '/api/mercure/authorization'},
});
```

## Derrière un proxy TLS

Si un proxy ou votre hébergeur termine le TLS avant FrankenPHP (`SERVER_NAME: :80`), deux réglages s'ajoutent :

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

- **`resource_identifier`** : le hub vérifie que chaque token lui est destiné. Il déduit sinon l'URL attendue de la requête, et voit alors `http://` au lieu de `https://`, ce qui lui fait refuser le cookie (401).
- **`trusted_proxies`** : Symfony garde `https://app.example.com` pour construire les topics et les droits du cookie.

## Vérifier

Avec un cookie de session valide :

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

Si rien n'arrive, comparez le topic écouté et l'URL de l'item : même schéma, même hôte, même port ([Dépannage](depannage.md#temps-réel)).

## Hors de la configuration de référence

| Choix | Conséquence pour le bridge |
|---|---|
| Groupes de sérialisation | Le payload Mercure peut différer du GET, et les écritures sont typées avec le modèle de lecture. |
| Ressource DTO (`stateOptions`) ou `output:` | API Platform ne publie rien automatiquement, ou publie un payload différent du GET. |
| `uriTemplate` personnalisé sur l'item | L'IRI n'est plus `{collection}/{id}` : déclarer `topic` dans `FacadeFactory.create()`. |
| Options Mercure `topics`, `data`, `type` | Écouter avec `BridgeFacade.watch$()` et traiter le format soi-même ; `type` n'est pas reçu. |
| API sur un autre domaine | Voir [Configuration](configuration.md#api-sur-un-autre-domaine-authentification-par-token). |

### Publier sur un topic personnalisé

Pour des notifications par utilisateur, publiez vous-même :

```php
$hub->publish(new Update(
    sprintf('%s/users/%d/notifications', $appBaseUrl, $user->getId()),   // URL absolue, identique côté front
    json_encode(['title' => 'Nouvelle tâche', 'task' => '/api/tasks/7']),
    private: true,
));
```

Côté front : `bridge.watch$({match: '/users/42/notifications'})` ([Temps réel](temps-reel.md#écouter-un-topic-qui-nest-pas-une-iri-ditem)).
