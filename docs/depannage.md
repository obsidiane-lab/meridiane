# Dépannage

Activez d'abord `debug: true` dans `provideBridge()` et ouvrez `BridgeFacade.realtimeDiagnostics$()` : ils montrent les requêtes, les connexions, les abonnements et les refus du hub.

## Temps réel

| Symptôme | Cause probable | Solution |
|---|---|---|
| Statut toujours `closed` | `mercure.hubUrl` absent, ou aucun `watch$()` souscrit | Ajouter `hubUrl` ; vérifier que l'Observable est bien souscrit. |
| Statut bloqué sur `connecting`, échecs qui augmentent | Le hub refuse la connexion (401, 403, 429 ou 400) | Voir les lignes suivantes ; l'onglet Réseau montre le code de `/.well-known/mercure`. |
| 401 sur `/.well-known/mercure` | Pas de cookie, cookie expiré ou signé avec une autre clé | Déclarer `mercure.authorize` ; vérifier que `publisher` et `subscriber` du hub utilisent la clé du bundle et le même issuer (`iss`). |
| 401 malgré un cookie valide | Le hub attend une autre audience (`aud`) que `MERCURE_PUBLIC_URL` : port explicite (`:443`), autre hôte, ou proxy TLS | `MERCURE_PUBLIC_URL` = URL exacte appelée par le navigateur ; derrière un proxy TLS, `resource_identifier` ([Backend](backend.md#derrière-un-proxy-tls)). |
| Le cookie n'est jamais enregistré (dev HTTP) | Nom en `__Secure-…` sur HTTP | Hub : `cookie_name mercure_access_token` ; Symfony en `kernel.debug`. |
| Le cookie n'est pas enregistré (API sur un autre domaine) | Réponse cross-origin sans credentials | `http.withCredentials: true` et CORS `Access-Control-Allow-Credentials`. |
| 400 sur `/.well-known/mercure` | Sélecteur invalide (URL Pattern mal formé) | Corriger le `topic` de la façade ou le `match` de `BridgeFacade.watch$()`. Un sélecteur invalide bloque la connexion qui le porte. |
| 414 ou 431 | URL d'abonnement trop longue pour un proxy | Baisser `mercure.maxUrlLength`. |
| Connecté mais aucun événement | Topic publié ≠ topic écouté | Le topic d'item est l'IRI absolue construite par Symfony : `baseUrl` doit avoir le même hôte. Pour un worker ou une commande, configurer `router.default_uri`. |
| Aucun événement sur une ressource privée | Le cookie ne donne pas le droit de lire ce topic | Ajouter le topic ou l'URL Pattern dans les droits de l'endpoint d'autorisation. |
| Aucun événement pour un topic personnalisé | Topic relatif côté backend | Publier l'URL absolue identique à `baseUrl` + chemin. |
| `URLPattern is not available` | Navigateur sans `URLPattern` | Charger `urlpattern-polyfill`. |
| Une suppression est stockée comme une entité vide | Le payload n'est pas `{"@id"}` (option Mercure `data`) | Publier le payload natif ou écouter avec `BridgeFacade.watch$()` et traiter le format. |
| L'écran ne voit pas un événement publié avec l'option `type` | Le bridge n'écoute que l'événement par défaut | Retirer l'option `type` côté backend. |
| Les droits ne changent pas après login ou logout | Le hub ne réévalue les droits qu'à la connexion | Appeler `BridgeFacade.reconnectRealtime()`. |

## HTTP

| Symptôme | Cause probable | Solution |
|---|---|---|
| 403 `Invalid CSRF token` sur POST/PATCH/DELETE | En-tête `X-XSRF-TOKEN` absent | Angular ne l'ajoute qu'en même origine (URL relative sur Angular 20) : utiliser `baseUrl: '/'` ; vérifier que le cookie `XSRF-TOKEN` est lisible par JavaScript. |
| Session non envoyée à l'API | API sur une autre origine | `http.withCredentials: true` et CORS avec credentials, ou passer par un token (`auth`). |
| `Authorization` absent | Requête hors `baseUrl` | `auth` ne s'applique qu'à `baseUrl` ; pour un autre service, un intercepteur dans `extraInterceptors`. |
| 415 Unsupported Media Type | Format non déclaré côté API Platform | Déclarer `jsonld` dans `formats` et `merge-patch+json` dans `patch_formats`. |
| Deux requêtes identiques n'en font qu'une | `singleFlight` | Comportement voulu ; `singleFlight: false` pour le désactiver. |

## Génération

| Symptôme | Cause probable | Solution |
|---|---|---|
| Deux modèles proches (`Error` et `ErrorJson`) | Deux représentations de forme différente dans le contrat | Normal ; retirer de `api_platform.formats` les formats inutiles. |
| Un champ attendu manque dans le modèle | Groupes de normalisation de l'opération | Corriger les groupes côté API, puis régénérer. |
| Un champ est optionnel (`?`) alors qu'il est toujours présent | Le contrat ne le déclare pas requis | Le déclarer requis côté API (contraintes ou `#[ApiProperty(required: true)]`). |
| `Spec fetch failed` | API arrêtée ou URL fausse | Démarrer l'API ou passer un fichier : `--spec ./openapi.json`. |
