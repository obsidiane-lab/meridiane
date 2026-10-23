# Webfront Angular - instructions Codex

## Lire peu

Pour une tache frontend, lire :

1. `AGENTS.md`
2. le skill principal `obsidiane-*`
3. `.codex/recipes/frontend-page.md` ou `.codex/recipes/crud-fullstack.md`
4. le skill `spartan` pour toute interface visible
5. une carte dans `.codex/patterns/frontend/` seulement si necessaire
6. le code du module equivalent

Ne pas lire toute la doc frontend par defaut.

## UI Spartan

- Spartan UI est l'unique kit UI. Avant toute interface visible, lire integralement `docs/ui/spartan.md` puis appliquer le skill `spartan` ; ce document est la convention UI durable unique.
- `src/app/shared/ui/**` est une sortie generee. Ne jamais y creer, modifier, deplacer ou supprimer manuellement un fichier ; seul le CLI Spartan peut y ecrire.
- Les pages et composants applicatifs vivent hors de cette sortie, importent Helm via `@spartan-ng/helm/*` et appliquent sans variante locale la composition, le theme, Tailwind et Lucide definis dans `docs/ui/spartan.md`.
- Une primitive absente est ajoutee par le CLI apres inspection du projet. Les migrations, upgrades, regenerations globales et changements de theme appartiennent a une maintenance Spartan explicite.

## Invariants frontend

- Respecter `store -> repository -> service -> composant`.
- Les tests unitaires Angular sont interdits : ne pas en creer ni en generer. Conserver `skipTests: true` pour les schematics Angular qui proposent cette option.
- Store : etat local, par IRI, sans HTTP.
- Repository : bridge + HTTP/RxJS/SSE + synchronisation store.
- Service : vocabulaire feature, actions et signals.
- Signal d'entite : `EntityResource<T>` par IRI ; `state` pilote l'ecran, `ready` garantit `value`, `loading` peut garder une valeur stale.
- Composant : UI, routes, navigation, formulaires, abonnements bornes et lecture directe des signaux d'entite.
- Formulaire avec validation ou mapping non trivial : fichier dedie `forms/*.form.ts`. Utiliser Signal Forms par defaut si les controles Spartan sont compatibles ; avec Reactive Forms, implementer `FormType` et centraliser champs, validators, reset et payload.
- Squelettes Angular : privilegier `ng generate` ou `npm run ng -- generate` pour composant, service, guard, pipe, directive, classe ou interface quand le schematic couvre le besoin, puis adapter au pattern Foundation.
- Ne jamais modifier `webfront/bridge/` a la main.
- Ne pas creer de type local qui duplique un modele genere.
- Liste standard : la composition Spartan `AppTable` si pertinente.
- CRUD visible : strategie SSE explicite.

## Checks

- `make lint`
- `make build`
- `make bridge` si contrat regenere
- le healthcheck sans ecriture donne dans `docs/ui/spartan.md` si Spartan est genere ou mis a niveau

## Documentation

Pas de documentation durable pour une page standard. Mettre a jour `docs/project/` seulement si convention UI, theme global, contrat public ou workflow durable change.
