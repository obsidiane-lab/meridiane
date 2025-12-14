# Meridiane — Documentation

Meridiane génère un **package npm Angular** (un “bridge”) à partir d’une spec **OpenAPI** (typé pour API Platform).

Un bridge contient :
- un runtime Angular (HTTP + helpers + facades) ;
- des models TypeScript (optionnel, générés depuis OpenAPI) ;
- une documentation d’utilisation embarquée (`README.md`) directement dans le package publié.

Meridiane est **standalone** : il ne modifie pas votre workspace Angular. Tout est généré sous `dist/` via un workspace temporaire `dist/.meridiane-workspace`.

## Démarrer

Si vous maintenez un backend et que vous voulez produire un package npm réutilisable par plusieurs apps Angular : `docs/creer-un-bridge.md`.

Si vous consommez déjà un package bridge dans une app Angular : `docs/consommer-un-bridge.md`.

Référence CLI (commandes, options, sorties) : `docs/utilisation.md`.

## Référence (bridge généré)

API publique : `docs/fonctionnalites/api-publique.md`  
HTTP / Hydra : `docs/fonctionnalites/fonctionnalites-http.md`  
Mercure / SSE : `docs/fonctionnalites/fonctionnalites-mercure-sse.md`  
FAQ / limites : `docs/fonctionnalites/faq.md`

## Projet Meridiane

Versioning & releases : `docs/versioning.md`
