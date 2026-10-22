# Pattern - AppTable, composition Spartan

## Utilise quand

Liste standard, paginee, triable, filtrable ou avec actions par ligne.

## Emplacement

Pages liste sous `webfront/src/app/modules/<module>/pages/**` avec `webfront/src/app/shared/components/table/**`.

AppTable est une composition applicative Foundation construite avec les primitives Spartan Table, Card, Empty, Spinner, Pagination et Popover. Elle vit dans `shared/components`, jamais dans la zone generee `shared/ui/**`. Une page configure ses templates et son chargement sans modifier les primitives Spartan.

## Squelette mental

- Pagination serveur si collection API.
- Colonnes declarees clairement.
- Actions via menu ou boutons dedies.
- Empty/loading/error visibles.
- Reload de la pagination courante apres action ou evenement SSE collection.
- AppTable garde son propre etat local ; ne pas rendre la liste paginee depuis le store d'entites.
- La page passe la fonction de collection (`service.fetchAll$`) a `callBackDataFetch`.
- La page s'abonne a `service.watchCollection$()` et appelle `table.reload()` a chaque event SSE collection ; le repository upsert l'entite recue pour garder le store frais.

## Checks

`make lint`; `make build`; verification manuelle si logique table complexe.

## Anti-patterns

Seconde abstraction de table ou table HTML reinventee pour une liste standard, modification de `shared/ui/**`, pagination client sur gros volume, absence d'etat empty/error, rendu de la liste AppTable depuis le store d'entites.
