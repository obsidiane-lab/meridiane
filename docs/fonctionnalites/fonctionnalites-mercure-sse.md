# Fonctionnalités Mercure / SSE

Cette page fait partie des docs de fonctionnalités.

Le bridge propose une intégration Mercure/SSE conçue pour les apps Angular :
une seule connexion EventSource, une gestion de topics robuste, et une API simple côté facade.

## Mono-connexion et gestion des topics

Le bridge maintient une seule connexion SSE et un registre de topics.
Chaque abonnement incrémente un compteur et chaque désabonnement le décrémente.
Le topic n’est réellement retiré que lorsque le compteur retombe à zéro, ce qui permet plusieurs consommateurs sans conflit.

## Dernier event et reprise

Quand Mercure fournit `lastEventId`, le bridge le mémorise et le réutilise lors d’une reconnexion via le paramètre `lastEventID`.
L’objectif est de limiter les “trous” lors des reconnections.

## Activation optionnelle

Mercure est optionnel.
Sans `hubUrl`, le bridge désactive simplement la partie realtime, sans impacter les appels HTTP.

## Filtrer des événements (sous-ressources)

Le bridge permet de s’abonner à un topic parent et de filtrer côté client sur un champ relationnel.
C’est pratique quand une sous-ressource doit “remonter” sur le topic d’un parent (ex: `Message` sur le topic d’une `Conversation`).

## Credentials et cookies

Le bridge peut ouvrir l’EventSource avec `withCredentials` lorsque `mercure.init.credentials = 'include'` (ou `withCredentials: true`).
Cela facilite les setups Mercure basés sur cookies/session.
