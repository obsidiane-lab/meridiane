# Pattern - DTO ApiResource

## Utilise quand

Contrat public, stable, sensible, divergent du modele Doctrine, read/write asymetrique, projection, aggregation ou mapping non trivial.

## Emplacement

- `core/src/ApiResource/<Name>.php`
- `core/src/State/Provider/<Name>Provider.php` si lecture custom
- `core/src/State/Processor/<Name>Processor.php` si ecriture custom
- entites Doctrine conservees dans `core/src/Entity/`

## Squelette mental

- La classe ApiResource porte le contrat expose.
- Les champs publics du contrat sont explicites.
- Validations sur input.
- Provider/processor seulement si necessaires.
- Aucun champ interne ne fuit.
- Bridge regenere si visible frontend.

## Checks

`make phpstan`; verification OpenAPI si possible ; `make bridge` ; build frontend si usage.

## Anti-patterns

DTO pass-through sans isolation utile, mapping implicite non teste, provider/processor qui delegue sans valeur, duplication d'un modele bridge cote frontend.
