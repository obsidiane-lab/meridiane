# Backend

Ce que Symfony, API Platform et le hub Mercure doivent fournir au bridge.

## Formats

```yaml
# config/packages/api_platform.yaml
api_platform:
  formats:
    jsonld: ['application/ld+json']
    multipart: ['multipart/form-data']   # seulement si vous acceptez des uploads
  patch_formats:
    json: ['application/merge-patch+json']
```

Le bridge parle JSON-LD. Les formats déclarés ici décident des modèles générés : n'exposez pas `json` ou `multipart` sans en avoir l'usage.

## Publier les ressources

```php
#[ApiResource(mercure: true)]                       // updates publiques
#[ApiResource(mercure: ['private' => true])]        // réservées aux abonnés autorisés
class Project {}
```

À chaque écriture, API Platform publie :

| Événement | Topic | Payload |
|---|---|---|
| création, modification | IRI absolue de l'item (`https://app.example.com/api/projects/42`) | la ressource en JSON-LD |
| suppression | même topic | `{"@id": "/api/projects/42"}` |

- **Pas de topic de collection.** `watch$()` écoute la ressource par URL Pattern sur ces topics d'item.
- **Même représentation que le GET.** Le payload remplace l'entrée du store : il doit contenir les mêmes champs (mêmes groupes de normalisation).
- **Données liées.** Pour qu'un écran voie un compteur ou une relation à jour, publiez aussi la ressource concernée (option `topics`, ou publication manuelle).

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

## Autoriser les abonnés

Le bridge appelle l'endpoint déclaré dans `mercure.authorize`. Il pose un cookie dont les droits **reflètent ce que l'utilisateur peut lire** : le hub ne livre une update privée qu'aux tokens dont un droit couvre son topic.

```php
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Mercure\Authorization;
use Symfony\Component\Mercure\Jwt\Grant;

final class MercureAuthorizationController extends AbstractController
{
    #[Route('/api/mercure/authorization', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function __invoke(Request $request, Authorization $authorization, #[CurrentUser] User $user): Response
    {
        $base = $request->getSchemeAndHttpHost();

        // Topics exacts ou URL Patterns, selon ce que l'utilisateur a le droit de lire.
        $topics = ['exact' => [$base.'/users/'.$user->getId().'/notifications']];
        if ($this->isGranted('ROLE_ADMIN')) {
            $topics['urlpattern'] = [$base.'/api/projects/:id'];
        }

        // expiresIn : le bridge renouvelle le cookie avant que le hub ne coupe la connexion.
        $response = new JsonResponse(['expiresIn' => 600], 200, ['Cache-Control' => 'no-store, private']);
        $response->headers->setCookie($authorization->createCookie(
            $request,
            [new Grant([Grant::ACTION_SUBSCRIBE], $topics)],
            null,
            ['exp' => new \DateTimeImmutable('+600 seconds')],
        ));

        return $response;
    }
}
```

- **Durée courte** (10 min) : le hub ferme chaque connexion avant l'expiration de son token, et le navigateur se reconnecte seul. Avec `expiresIn` (secondes, même valeur que `exp`), le bridge renouvelle le cookie 5 secondes avant son expiration : les reconnexions partent toujours avec un token valide et reprennent avec `Last-Event-ID`. Sans `expiresIn` (réponse 204), la reconnexion est refusée (401) et le bridge renouvelle le cookie après ce refus.
- **Logout** : renvoyez `$authorization->createClearCookie($request)`.
- **Utilisateur non connecté** : l'endpoint répond 401. Le bridge réessaie plus tard ; votre intercepteur 401 global doit ignorer cette URL.
- Le cookie est `HttpOnly`, `SameSite=Strict`, limité au chemin du hub. Il s'appelle `__Secure-mercure_access_token` en HTTPS, et `mercure_access_token` quand `kernel.debug` est actif.

## Hub Mercure

Module Mercure de Caddy / FrankenPHP (≥ 1.13 pour Mercure 1.x) :

```caddyfile
mercure {
	transport bolt {
		path /data/mercure.db
	}
	issuer {$APP_BASE_URL} {
		publisher {
			jwt {env.MERCURE_JWT_KEY} HS256
		}
		subscriber {
			jwt {env.MERCURE_JWT_KEY} HS256
		}
	}
	cors_origins https://app.example.com
	# dev en HTTP uniquement :
	# cookie_name mercure_access_token
}
```

- **Une seule clé.** symfony/mercure-bundle signe les publications **et** le cookie abonné avec la clé du hub : `publisher` et `subscriber` doivent la vérifier toutes les deux.
- **`anonymous`** seulement si des updates publiques doivent être reçues sans cookie.
- **`cors_origins`** : origines exactes du front, obligatoire dès que le front n'est pas sur l'origine du hub.
- Les directives Mercure 0.x (`publisher_jwt`, `subscriber_jwt`, `demo`) n'existent plus.

## symfony/mercure-bundle

```yaml
# config/packages/mercure.yaml
mercure:
  hubs:
    default:
      url: '%env(MERCURE_URL)%'                 # URL interne (ex. http://core/.well-known/mercure)
      public_url: '%env(MERCURE_PUBLIC_URL)%'   # URL vue par le navigateur
      protocol_version: '1.0'
      jwt:
        secret: '%env(MERCURE_JWT_KEY)%'
        publish: ['*']
        claims:
          iss: '%env(APP_BASE_URL)%'            # = issuer déclaré sur le hub
          sub: 'api'
          client_id: 'api'
```

Versions : symfony/mercure ≥ 0.9 et symfony/mercure-bundle ≥ 0.6.

## Publications hors requête HTTP

Les topics sont des URL absolues construites par le routeur. Une commande ou un worker Messenger n'a pas de requête : fixez l'hôte, sinon les topics ne correspondront pas à ceux du front.

```yaml
# config/packages/routing.yaml
framework:
  router:
    default_uri: '%env(APP_BASE_URL)%'
```

## Checklist

- [ ] `api_platform.formats` limité aux formats utilisés (JSON-LD au minimum).
- [ ] `mercure: true` ou `['private' => true]` sur les ressources suivies en direct.
- [ ] Payload publié = représentation du GET.
- [ ] Endpoint d'autorisation : droits par utilisateur, durée courte, effacement au logout.
- [ ] Hub : `issuer` avec une seule clé pour `publisher` et `subscriber`, `cors_origins`, `cookie_name` en dev HTTP.
- [ ] `router.default_uri` pour les publications asynchrones.
