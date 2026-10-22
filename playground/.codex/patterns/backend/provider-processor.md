# Pattern - Provider / Processor

## Utilise quand

Lecture externe, projection complexe, mapping DTO, effets de bord, persistance multiple, regle mutationnelle ou workflow non couvert par Doctrine/API Platform.

## N'utilise pas quand

Le comportement natif API Platform suffit.

## Emplacement

- `core/src/State/Provider/<Name>Provider.php`
- `core/src/State/Processor/<Name>Processor.php`

## Squelette mental

- Provider = construit l'etat lu.
- Processor = applique la mutation et retourne l'etat attendu.
- Les deux restent fins et deleguent la logique metier complexe a un service dedie si necessaire.

## Checks

`make phpstan`; verification manuelle ciblee si workflow metier ; verifier securite item/collection.

## Anti-patterns

Provider pass-through, processor pass-through, securite uniquement dans le processor alors que la lecture reste ouverte.
