# Pattern - store -> repository -> service -> composant

## Utilise quand

Toute feature Angular qui lit, modifie ou affiche une ressource API.

## Emplacements

```text
webfront/src/app/modules/<module>/
  stores/<name>.store.ts
  repositories/<name>.repository.ts
  services/<name>.service.ts
  pages/**
  components/**
  forms/**
```

Generer d'abord les artefacts Angular supportes avec `ng generate` ou `npm run ng -- generate`, puis deplacer ou adapter le squelette aux emplacements Foundation si necessaire.

## Responsabilites

- Store : memoire reactive locale, index par `@id`/IRI, aucun HTTP, aucune navigation.
- Repository : bridge Meridiane, HTTP/RxJS/SSE, fetch reel, normalisation technique, synchronisation du store.
- Service : vocabulaire de feature, actions utilisateur, signaux exposes, orchestration simple.
- Composant : composition UI Spartan, formulaire, navigation locale, etats d'ecran, abonnements bornes, lecture directe des signaux d'entite.
- Formulaire : `forms/*.form.ts` pour la validation et le mapping non triviaux ; Signal Forms si compatible, ou `FormType` lorsque Reactive Forms est requis.

## Signaux d'entite

Pour une entite par IRI, appliquer `.codex/patterns/frontend/entity-resource-signal.md`.

- Le service expose un `Signal<EntityResource<T>>`, souvent en simple relais du repository.
- Le repository retourne le signal immediatement, declenche le fetch si `idle`, met le store en `loading`, puis passe en `ready` via `tap(...store.upsert(...))`.
- Le repository applique aussi les evenements Mercure via `watch$`/`watchCollection$` et le meme `store.upsert(...)`, ce qui garde les entites connues a jour. Pour AppTable (composition applicative Spartan), la liste affichee reste la reponse paginee de la table : `watchCollection$` garde le store frais puis declenche un reload de la pagination courante.
- Le composant consomme directement `resource.state` et `resource.value` dans le template.
- `loading` peut conserver une valeur stale ; seul `ready` garantit que `value` est la ressource courante exploitable.

## Direction de dependance

```text
composant -> service -> repository -> bridge/API
service -> repository pour exposer ou composer les signals
repository -> store pour exposer les signals d'entite et synchroniser les resultats techniques
```

## Nommage

- `<name>.store.ts` -> `<Name>Store`
- `<name>.repository.ts` -> `<Name>Repository`
- `<name>.service.ts` -> `<Name>Service`
- methodes RxJS suffixees `$`
- signals exposes avec prefixe `$` si la convention existante l'utilise

## Checks

`make lint`; `make build`; verification manuelle ciblee si logique store/service/repository.

## Anti-patterns

`HttpClient` dans composant, bridge direct dans composant, store qui appelle HTTP, service qui transforme inutilement un signal sans logique, type local dupliquant le bridge, abonnement non borne.
