# Documentation Meridiane

Meridiane lit le contrat OpenAPI de votre API Platform et génère une librairie Angular, **le bridge**. Elle contient :

- les **modèles TypeScript** de vos ressources ;
- un **client HTTP** qui applique les conventions d'API Platform (JSON-LD, Hydra, merge-patch) ;
- le **temps réel Mercure 1.0** : abonnement à une ressource ou à un item, connexions partagées, autorisation par cookie.

Le bridge gère la communication avec le backend. La gestion des données (stores, repositories, services) reste dans votre application.

## Mettre en place

| Étape | Page |
|---|---|
| 1. Configurer FrankenPHP, Mercure, Symfony et API Platform | [Backend](backend.md) |
| 2. Générer le bridge, faire un premier appel, suivre une ressource | [Démarrage](demarrage.md) |
| 3. Régler `provideBridge()`, le serveur de développement, l'authentification | [Configuration Angular](configuration.md) |

## Utiliser

| Je veux… | Page |
|---|---|
| Lire et écrire des ressources | [HTTP](http.md) |
| Afficher les mises à jour en direct | [Temps réel](temps-reel.md) |
| Partir d'un cas concret (store, liste, formulaire, upload…) | [Recettes](recettes.md) |
| Comprendre ce que fait le bridge | [Fonctionnement](fonctionnement.md) |
| Retrouver une option ou une méthode | [Référence](reference.md) |
| Utiliser les commandes du CLI | [CLI](cli.md) |
| Résoudre un problème | [Dépannage](depannage.md) |
| Migrer depuis Meridiane 2.x | [Migration 3.0](migration-3.0.md) |

## Compatibilité

| Élément | Version |
|---|---|
| Application | Angular 20, 21 ou 22, RxJS 7.8 |
| API | API Platform 5, format JSON-LD |
| Temps réel | hub Mercure 1.x (FrankenPHP ≥ 1.13), symfony/mercure ≥ 0.9, symfony/mercure-bundle ≥ 0.6 |
| CLI | Node.js ≥ 24 |
