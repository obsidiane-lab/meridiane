# Documentation Meridiane

Meridiane lit le contrat OpenAPI de votre API Platform et génère une librairie Angular, **le bridge**. Elle contient :

- les **modèles TypeScript** de vos ressources ;
- un **client HTTP** qui applique les conventions d'API Platform (JSON-LD, Hydra, merge-patch) ;
- le **temps réel Mercure 1.0** : abonnement à une ressource ou à un item, connexions partagées, autorisation par cookie.

Le bridge gère la connexion avec le backend. La gestion des données (stores, repositories, services) reste dans votre application.

## Par où commencer

| Je veux… | Page |
|---|---|
| Générer le bridge et faire un premier appel | [Démarrage](demarrage.md) |
| Comprendre ce que fait le bridge | [Fonctionnement](fonctionnement.md) |
| Configurer l'URL de l'API, les cookies, l'authentification, Mercure | [Configuration](configuration.md) |
| Lire et écrire des ressources | [HTTP](http.md) |
| Afficher les mises à jour en direct | [Temps réel](temps-reel.md) |
| Préparer Symfony, API Platform et le hub Mercure | [Backend](backend.md) |
| Partir d'un cas concret | [Recettes](recettes.md) |
| Retrouver une option ou une méthode | [Référence](reference.md) |
| Utiliser les commandes du CLI | [CLI](cli.md) |
| Résoudre un problème | [Dépannage](depannage.md) |
| Migrer depuis Meridiane 2.x | [Migration 3.0](migration-3.0.md) |

## Compatibilité

| Élément | Version |
|---|---|
| Application | Angular 20, 21 ou 22, RxJS 7.8 |
| API | API Platform 4, format JSON-LD |
| Temps réel | hub Mercure 1.x, symfony/mercure ≥ 0.9, symfony/mercure-bundle ≥ 0.6 |
| CLI | Node.js ≥ 24 |

Pour faire évoluer le générateur lui-même, voir [l'architecture du dépôt](contributing/architecture.md).
