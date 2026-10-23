# Pattern - Entity Doctrine ApiResource

## Utilise quand

CRUD interne/backoffice simple, modele persistant proche du contrat, pas de champ sensible expose, pas de contrat public stable.

## N'utilise pas quand

Contrat public, projection, read/write divergent, champ sensible, aggregation, mapping metier complexe ou besoin de stabilite independante du schema Doctrine.

## Emplacement

- `core/src/Entity/<Name>.php`
- `core/src/Repository/<Name>Repository.php`
- migration Doctrine generee via `php bin/console d:m:diff` si schema change

## Squelette mental

- Entite Doctrine avec validations.
- Squelette initial via `php bin/console make:*` quand MakerBundle couvre le besoin, puis adaptation au contrat Foundation.
- `#[ApiResource(operations: [...])]` explicite.
- `security` operationnel simple.
- Relations en IRI.
- `mercure` si CRUD visible ou temps reel attendu.

## Checks

`make phpstan`; migration via `php bin/console d:m:diff` si schema ; `make bridge` si contrat visible.

## Anti-patterns

Groupes complexes pour cacher un contrat divergent, champ sensible expose, relation embed par confort, operations implicites dans une zone sensible.
