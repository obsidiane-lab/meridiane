# Exemple - Page liste avec AppTable

```ts
private readonly service = inject(ResourceService);
private readonly table = viewChild<TableComponent<Resource>>(TableComponent);

protected readonly fetchResources = (query: Query) => this.service.fetchAll$(query);

public constructor() {
  effect((onCleanup) => {
    const table = this.table();
    if (!table) return;

    const subscription = this.service.watchCollection$().subscribe({
      next: () => table.reload(),
    });
    onCleanup(() => subscription.unsubscribe());
  });
}
```

```html
<app-table [callBackDataFetch]="fetchResources" />
```

AppTable est la composition applicative Foundation des primitives Spartan de table, pagination et etats. La page lui passe une fonction de collection du service ; le service delegue au repository. `fetchAll$` upsert les membres recus dans le store, puis AppTable affiche la reponse paginee. AppTable garde son propre etat local et recharge sa pagination courante quand un event SSE de la ressource (URL Pattern) arrive. Le repository upsert aussi l'entite recue par SSE pour garder le store frais.
