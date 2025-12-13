# Créer un bridge (concept)

Cette page fait partie des docs de création.

Meridiane est pensé pour un workflow simple : **un backend API Platform** → **un package npm** → **une ou plusieurs apps Angular**.
Le package npm est l’artefact central : il regroupe les types (models OpenAPI) et les helpers runtime (HTTP + Mercure/SSE) qui rendent l’intégration plus rapide et plus uniforme.

## Ce que contient un bridge

Un bridge généré contient généralement :

- une lib Angular prête à publier (build via `ng build <lib-name>`, sortie dans `dist/<lib-name>`)
- des models TypeScript générés depuis la spec OpenAPI
- une API publique stable à consommer dans les apps Angular (`provideBridge`, `FacadeFactory`, `ResourceFacade`, types)

Le bridge n’est pas un “SDK complet” : l’idée est de fournir une base robuste (conventions API Platform, ergonomie Angular, SSE/Mercure), tout en restant extensible via configuration et interceptors.

## Pourquoi un package par backend

Un backend API Platform définit un contrat (routes, formats, modèles, conventions).
Avoir un package bridge par backend permet de versionner et publier ce contrat sans mélanger plusieurs APIs dans un même artefact.

## Où vivent les fichiers

Dans un workspace Angular, la lib bridge vit dans `projects/<lib-name>`.
Les models sont habituellement générés dans `projects/<lib-name>/src/models` pour être publiés avec le package.

À la compilation, Angular place l’artefact publiable dans `dist/<lib-name>`.

## Versionner et publier

Le bridge suit le SemVer côté package npm.
Dans la pratique, on versionne et publie sur tag/release, et on régénère les models à chaque évolution du backend (ou dès que la spec change).
