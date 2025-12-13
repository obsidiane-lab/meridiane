# Documentation Meridiane

Meridiane produit un **package npm “bridge”** dédié à un backend **Symfony / API Platform**.
Ce package regroupe :

- vos **modèles TypeScript** (générés depuis OpenAPI)
- une **API runtime Angular** pour simplifier le HTTP et le temps réel via **Mercure/SSE**

Ici, la doc reste volontairement centrée sur la **présentation des fonctionnalités** et la **surface d’API**.

## Je veux…

- Comprendre ce qu’est un bridge et ce qu’il contient : `docs/creation/creer-un-bridge.md`
- Lire les fonctionnalités HTTP (API Platform/Hydra) : `docs/fonctionnalites/fonctionnalites-http.md`
- Lire les fonctionnalités Mercure/SSE : `docs/fonctionnalites/fonctionnalites-mercure-sse.md`
- Voir l’API publique à consommer côté Angular : `docs/fonctionnalites/api-publique.md`
- Comprendre le CLI (ce que chaque commande génère) : `docs/utilisation/cli.md`
- Comprendre la configuration (`models.config.js`, `.env`, debug) : `docs/utilisation/configuration.md`

## Tutoriels

- Exemple CI/CD (pipeline) : `docs/utilisation/tutoriel-ci-cd.md`
- Exemple local (hors pipeline) : `docs/utilisation/tutoriel-local.md`

## Dépannage

- FAQ / limites : `docs/utilisation/faq.md`
