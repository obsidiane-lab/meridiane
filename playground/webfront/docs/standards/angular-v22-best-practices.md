# Angular 22 - bonnes pratiques pour Foundation

Guide operable pour produire du code Angular 22 compatible avec le template.
Derniere reverification doctrinale : **2026-07-15**.

## 1. Principes du template

- Angular 22 utilise les composants standalone, le mode zoneless et `OnPush` par defaut.
- Omettre `standalone: true` et `changeDetection: ChangeDetectionStrategy.OnPush` : ces valeurs sont deja les valeurs par defaut d'Angular 22.
- Ne pas ajouter `provideZonelessChangeDetection()` : le mode zoneless est natif depuis Angular 21. Verifier plutot que `provideZoneChangeDetection()` n'est pas configure.
- `provideBrowserGlobalErrorListeners()` reste configure au bootstrap pour transmettre les erreurs navigateur non gerees a l'`ErrorHandler` Angular.
- L'architecture projet reste : `store -> repository -> service -> composant`.
- Les pages visibles suivent routes, menu, i18n, UI states et SSE quand necessaire.

## 2. Standalone et imports

- creer des composants standalone, sans repeter `standalone: true` dans le code genere ;
- importer finement les directives, pipes et composants utiles ;
- utiliser le control flow natif (`@if`, `@for`, `@switch`, `@let`) ;
- utiliser les balises auto-fermantes pour les composants sans contenu projete ;
- utiliser les bindings natifs `[class]` et `[class.nom]` plutot que `NgClass` ; réserver `[style]` et `[style.propriete]` aux valeurs runtime portees par les donnees, conformement a `webfront/docs/ui/spartan.md` ;
- ne pas garder `CommonModule` par habitude quand quelques imports cibles suffisent.

## 3. Reactivite

- declarer `readonly` les champs crees par `input()`, `output()`, `model()`, `viewChild()`, `contentChild()` et leurs variantes ;
- preferer les API signal `input()`, `output()`, `model()` et queries aux decorateurs historiques pour le nouveau code ;
- signals pour l'etat courant affiche ou partage : ressource d'entite, loading UI, erreur UI, menu ouvert, selection locale ;
- `computed()` pour une donnee derivee ; il peut aussi mapper des IRI de relation vers des signals de ressources liees, mais ne doit pas servir d'alias de champ ni executer une commande ;
- `effect()` pour un effet de bord explicite et borne : brancher un SSE avec cleanup, synchroniser un `FormGroup`, declencher une navigation controlee ;
- RxJS pour les flux async, orchestration HTTP/SSE et compositions plus riches ;
- `toSignal()` pour exposer proprement un Observable au template si utile, en evitant de creer plusieurs subscriptions pour le meme flux ;
- `takeUntilDestroyed()` ou `DestroyRef` pour les subscriptions manuelles rares.
- declarer les listeners de l'element hote et du document dans la propriete `host` du decorateur plutot qu'avec `@HostListener` ou `@HostBinding`.

## 4. Zoneless et change detection

- ne pas compter sur ZoneJS pour rafraichir l'UI ;
- mettre a jour l'etat via des mecanismes Angular : signals, inputs, evenements, `markForCheck()` si necessaire ;
- eviter les mutations en place sur les objets/arrays portes par des signals ;
- `OnPush` est la strategie par defaut depuis Angular 22 : ne pas ajouter de metadata `changeDetection` sans besoin exceptionnel, mesure et documente ;
- toute API asynchrone imperativement branchee doit finir par notifier Angular via un signal, un input, un evenement ou `markForCheck()`.

## 5. Forms

- utiliser Signal Forms par defaut pour un nouveau formulaire quand tous les controles Spartan necessaires sont compatibles ;
- utiliser Reactive Forms pour les filtres d'`AppTable` et lorsqu'un `FormGroup`, des validateurs ou flux RxJS, ou un `ControlValueAccessor` non compatible avec Signal Forms est requis ;
- choisir une seule strategie par formulaire ; le contrat detaille vit dans `webfront/docs/ui/forms.md` ;
- isoler mapping formulaire <-> payload dans une couche lisible (`forms/`, helpers ou services) si le formulaire grossit.

## 6. Architecture de donnees

- pas de `HttpClient` dans les composants ;
- pas d'appel bridge direct depuis les composants ;
- le repository parle au bridge et synchronise le store ;
- le service expose l'API orientee usage ;
- les composants gerent presentation et orchestration legere.

## 7. UI CRUD

- liste paginee standard = `AppTable`, sauf exception justifiee ;
- activer le binding des parametres de route vers les inputs de composants avec `withComponentInputBinding()` et exposer les parametres requis avec `input.required()` ;
- detail/edit avec `EntityResource<T>` et etats UI derives (`loading`, `ready`, `empty`, `error`) ;
- pour l'entite principale d'une page, `$entity(iri)` est appele une fois dans la classe du composant/service, puis le template lit le `Signal<EntityResource<T>>` obtenu ;
- les relations exposees par IRI restent des IRI dans l'entite parent ; chaque entite liee est lue via son propre service, qui delegue au repository, et exposee comme `EntityResource<Relation>` ;
- `track` stable dans `@for` ;
- `@defer` seulement quand le gain est clair et documente.

## 8. Routing et chargement

- charger paresseusement aux frontieres de feature avec `loadChildren` ou `loadComponent` ;
- charger directement le shell et la page principale a l'interieur d'un fichier de routes deja lazy afin d'eviter une cascade de chunks pour le premier affichage ;
- reserver un nouveau `loadComponent` aux pages secondaires qui apportent un gain reel ;
- ne pas ajouter un niveau lazy a chaque route par automatisme.

## 9. Images

- utiliser `NgOptimizedImage` et `[ngSrc]` pour les images applicatives ;
- conserver `[src]` pour les sources dynamiques `data:` ou `blob:`, que `NgOptimizedImage` ne prend pas en charge ;
- fournir `width` et `height`, ou `fill` avec un conteneur correctement dimensionne, afin d'eviter les decalages de layout ;
- utiliser `priority` uniquement pour les images critiques du premier ecran ;
- verifier que le loader choisi est compatible avec le serveur d'images avant d'activer un `srcset` optimise.

## 10. Realtime et bridge

- toute feature CRUD visible doit declarer sa strategie SSE ;
- si le contrat backend change, evaluer puis regenerer le bridge ;
- ne jamais modifier `webfront/bridge/` a la main.

## 11. Securite navigateur

- ne jamais construire du HTML avec une donnee non fiable et ne pas contourner la sanitization Angular ;
- eviter les mutations DOM comme `innerHTML` ; utiliser les templates Angular ou, pour un fallback hors bootstrap, des noeuds avec `textContent` ;
- traiter CSP et Trusted Types comme une politique transverse coordonnee avec le backend, le reverse proxy et le deploiement ;
- ne pas activer automatiquement une option CSP experimentale sans verifier les en-tetes, nonces, scripts tiers et contraintes d'hebergement.

## 12. Outillage Angular

- utiliser le builder `@angular/build:application` pour construire l'application ;
- les tests unitaires sont interdits ; conserver `skipTests: true` pour les schematics Angular qui proposent cette option ;
- utiliser ESLint en flat config avec `eslint.config.js` ;
- conserver TypeScript dans la plage officiellement supportee par Angular 22 (`>=6.0 <6.1`) ;
- utiliser `module: preserve`, la resolution `bundler` et des alias `paths` explicites, sans `baseUrl` ;
- ne pas ajouter de polyfill ou ZoneJS sans besoin navigateur identifie.

## 13. Anti-patterns a eviter

- logique data lourde dans un composant ;
- mutation in-place d'un state porte par signal ;
- appel a la ressource principale depuis un template ou un `computed` au lieu d'exposer un signal de classe ;
- appel direct au service depuis le template pour construire une relation ; exposer les signals de relation depuis la classe, puis les lire dans le HTML ;
- `computed()` utilise pour produire des effets de bord ou pour masquer une methode imperative ;
- transformation systematique d'un `Observable` ou d'un `FormControl` en signal sans besoin d'affichage ;
- payload backend specifique a une page sans besoin stable ;
- code qui depend implicitement de ZoneJS ;
- cascade de shells et pages principales tous charges par des `loadComponent` successifs ;
- manipulation DOM directe quand un binding, une query signal ou un etat de composant suffit ;
- usage dogmatique de patterns alors qu'une composition simple suffit.
