# Pattern - Generation du bridge

## Utilise quand

Un type frontend genere est faux, un champ expose change, une operation API apparait ou le contrat backend evolue.

## Source de verite

Backend API Platform -> OpenAPI generee -> `make bridge` -> `webfront/bridge/`.

## Regles

- Ne jamais modifier `webfront/bridge/` a la main.
- Corriger le backend si le type genere est incorrect.
- Ne pas creer un type local pour masquer un contrat faux.
- Adapter repository, service et composant apres regeneration.

## Checks

`make bridge`; `make build`; `make phpstan` si backend.
