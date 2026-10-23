# Recette - Page ou feature Angular

## Quand utiliser

Page, composant, formulaire, table, store, repository, service, route, menu, i18n ou integration UI.

## Lire d'abord

1. `webfront/AGENTS.md`
2. le skill technique `spartan` si l'UI est touchee, puis `webfront/docs/ui/forms.md` pour tout formulaire
3. `.codex/patterns/frontend/store-repository-service-component.md` si la page manipule des donnees metier
4. `.codex/patterns/frontend/entity-resource-signal.md` si detail/edition/action sur une entite par IRI
5. `.codex/patterns/frontend/reactive-form.md` seulement si Reactive Forms est retenu
6. `.codex/patterns/frontend/app-table.md` si liste paginee
7. le code de la page/module le plus proche

## Pattern a appliquer

- Store : etat local par IRI, pas de HTTP.
- Repository : bridge + HTTP/RxJS/SSE + sync store.
- Service : vocabulaire metier et signals exposes.
- Composant : UI, navigation, formulaire, subscriptions bornees, lecture directe des signaux d'entite.
- Squelette Angular : privilegier `ng generate` ou `npm run ng -- generate` pour composant, service, guard, pipe, directive, classe ou interface quand le schematic couvre le besoin.
- Signaux d'entite : `EntityResource<T>` avec `state` pour l'ecran et `value` lue dans le bloc `ready`.
- Formulaires : isoler modele, validation et mapping dans `forms/*.form.ts` ; Signal Forms par defaut si les controles Spartan sont compatibles, `FormType` si Reactive Forms est requis.
- UI : appliquer les invariants de `webfront/AGENTS.md` et le workflow du skill `spartan`, sans recopier ni redefinir leur doctrine dans la feature.
- Liste standard : `AppTable`, composition applicative Spartan, si pertinent.

## Checks

- `make lint`
- `make build`

## Documentation durable seulement si

Nouvelle convention UI, composant partage reutilisable, pattern frontend nouveau, changement de routing structurant ou decision de theme global.
