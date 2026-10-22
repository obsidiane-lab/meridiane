# AppTable

## But

`AppTable` gère son état local de liste (page, taille, recherche et filtres), appelle une fonction de chargement et n'affiche que la réponse serveur courante. Son rendu compose les composants Spartan Table, Card, Empty, Spinner, Pagination et Popover.

Les règles générales de composition et de style vivent dans `webfront/docs/ui/spartan.md`.

## Quand l'utiliser

- liste paginée côté serveur ;
- recherche et filtres simples ;
- rechargement de la page courante après un événement SSE.

La liste reste server-side : `AppTable` ne lit pas directement un store et ne fusionne pas un cache global. Le composant de page lui fournit une fonction issue du service, conformément au flux `store -> repository -> service -> composant`.

## API

- `callBackDataFetch(query: Query)` : fonction requise retournant une `Collection<T>` dans un `Observable` ou une `Promise` ;
- `itemsPerPage`, `currentPage`, `searchPage` : valeurs initiales ;
- `searchFilterKey` : clé de filtre utilisée pour la recherche, `search` par défaut ;
- `filtersForm` : `FormGroup` associé à `filtersTemplate` ;
- `framed` : affiche la Card englobante, `true` par défaut ;
- `trackBy` : fonction optionnelle de suivi des lignes ;
- `queryChange` : notification de l'état de requête courant ;
- `reload()` : relance le chargement avec la page et les filtres courants.

## Templates projetés

- `#headerTemplate` est requis et contient une ligne composée avec `hlmTr` et `hlmTh` ;
- `#rowTemplate` est requis et reçoit l'élément courant en valeur implicite ;
- `#filtersTemplate` est optionnel et reçoit le formulaire sous le nom `form` ;
- `#actionTemplate` est optionnel et affiche des actions au-dessus et sous la table.

```html
<app-table [callBackDataFetch]="fetchConversations" [itemsPerPage]="10">
  <ng-template #headerTemplate>
    <tr hlmTr><th hlmTh>Titre</th></tr>
  </ng-template>
  <ng-template #rowTemplate let-conversation>
    <tr hlmTr><td hlmTd>{{ conversation.title }}</td></tr>
  </ng-template>
</app-table>
```

Le composant de page importe `TableComponent` et `HlmTableImports`. Les textes réels d'une feature passent par l'i18n.

## Filtres

- les filtres ne sont proposés que si `filtersForm` et `#filtersTemplate` sont présents ;
- ils sont appliqués avec l'action « Appliquer » ;
- le reset restaure les valeurs initiales du `FormGroup` ;
- les valeurs restent des primitives ou des tableaux de primitives ;
- recherche et filtres sont fusionnés dans `Query.filters` au chargement ;
- les contrôles internes utilisent uniquement les Reactive Forms.

## Concurrence et SSE

- `AppTable` ignore une réponse devenue obsolète lorsqu'une requête plus récente est en cours ;
- sans `trackBy`, le suivi essaie `id`, `@id`, `iri`, `uuid`, puis l'index ;
- lors d'un événement SSE de collection, le repository applique `upsert/delete` au store et la page appelle `table.reload()` ;
- ne pas ajouter un second spinner autour de la table.

Ce composant Foundation est conservé comme composition réutilisable. Le playground Conversation/Message peut afficher directement les signaux des ressources.
