# Spartan UI

## Source de vérité

Spartan UI est l'unique kit d'interface du webfront. Les pages utilisent ses primitives, ses variantes et ses tokens sémantiques, puis ajoutent uniquement les classes Tailwind nécessaires au layout et à la composition.

Ce document porte la convention UI durable. `webfront/AGENTS.md` oblige les agents à le lire et le
skill `spartan` orchestre son application ; aucun autre document ne redéfinit ces règles.

La couche UI ne modifie pas l'architecture des données : les features conservent le flux `store -> repository -> service -> composant`.

## Architecture

- `@spartan-ng/brain` fournit les comportements accessibles non stylés ;
- les composants Helm sont générés dans `src/app/shared/ui/` selon `components.json` ;
- le code applicatif les importe avec l'alias `@spartan-ng/helm/<composant>` ;
- les pages et composites applicatifs vivent hors de `src/app/shared/ui/` ;
- un composite Foundation n'est justifié que par un contrat applicatif réutilisable, jamais par le seul besoin d'envelopper une primitive.

`src/app/shared/ui/` est exclusivement géré par le CLI Spartan. Aucun fichier interne d'une primitive ne doit être modifié, copié ou supprimé manuellement. Une feature personnalise son interface par composition depuis son template ou depuis un composite applicatif situé hors de ce dossier.

## CLI Spartan

Depuis `webfront/` :

```bash
npm run ng -- generate @spartan-ng/cli:info --json
npm run ng -- generate @spartan-ng/cli:ui --name=dialog
npm run ng -- generate @spartan-ng/cli:healthcheck --auto-fix --dry-run --interactive=false
```

Toujours exécuter `info` avant une génération. Le générateur `ui` ajoute les fichiers Helm, les alias
et les dépendances Brain attendues. Ne pas relancer une primitive déjà installée.

Le healthcheck ci-dessus évite les prompts en simulant les corrections dans l'arbre Angular ;
`--dry-run` interdit leur écriture. Relire chaque résultat : un code de sortie nul ne valide pas un
contrôle de dépendances dont l'accès au registre a échoué.

Une maintenance explicite de thème utilise la palette unique du projet :

```bash
npm run ng -- generate @spartan-ng/cli:ui-theme --theme=neutral
```

Une maintenance Spartan peut appliquer réellement les corrections avec :

```bash
npm run ng -- generate @spartan-ng/cli:healthcheck --auto-fix --interactive=false
```

Relire alors tout le diff généré. Si `package.json` change, passer par le workflow d'installation npm
du projet pour synchroniser et relire `package-lock.json` avant lint et build. Une feature standard
n'exécute ni régénération globale, ni changement de thème, ni auto-fix réel.

## Styles et thème

Foundation utilise le style Spartan `nova`, une palette neutre noire et deux modes d'affichage : `light` et `dark`.

`webfront/src/styles.css` est l'unique feuille de style du webfront. Elle contient les imports Tailwind et Spartan, les tokens sémantiques, les valeurs de thème et les règles de base réellement globales.

Règles applicatives :

- utiliser les tokens sémantiques comme `bg-background`, `text-foreground`, `border-border` et `text-muted-foreground` ;
- choisir d'abord les variantes et tailles Spartan ;
- sur une primitive Spartan, ajouter uniquement des classes de placement : display, layout, espacement externe, dimensions, contraintes, overflow et variantes responsive ;
- placer couleur, typographie, alignement de texte, bordure, rayon et ombre sur un contenu ou conteneur applicatif lorsque la composition en a réellement besoin, jamais sur la primitive ;
- utiliser l'échelle Tailwind standard pour les espacements, tailles, rayons et typographies ;
- choisir l'échelon Tailwind standard le plus proche lorsqu'une valeur manque ; un nouveau token global exige un besoin récurrent du thème ;
- ne pas utiliser de valeur Tailwind arbitraire, de couleur brute, de propriété arbitraire ou de style inline pour le design ;
- ne pas ajouter de fichier CSS ou SCSS à un composant et ne pas déclarer `styleUrl` ou `styleUrls` ;
- ne pas créer de classe applicative globale dans `styles.css` ;
- ne pas ajouter de thème, de `data-theme` ou de feuille de style dynamique.

Les bindings `[style]` sont réservés à une valeur runtime réellement portée par les données, par exemple une progression calculée. Le layout, les couleurs, les espacements et la typographie utilisent les variantes Spartan, les tokens et les classes Tailwind standard.

Le code Helm généré peut contenir des expressions internes propres à Spartan. Elles restent confinées à `src/app/shared/ui/` et ne servent pas de modèle au code applicatif.

## Modes light et dark

- `ThemeService.mode()` expose `light` ou `dark` ;
- `ThemeService.setMode(mode)` applique un mode explicite ;
- `ThemeService.toggleMode()` bascule entre les deux modes ;
- `light` est le mode initial sans préférence persistée ;
- le choix est persisté dans `localStorage` sous la clé `theme` ;
- `:root` porte le mode clair et la classe `.dark` sur `<html>` active le mode sombre.

Le catalogue Spartan expose un sélecteur explicite composé avec Toggle Group. Le mode `system` ne fait pas partie du contrat du template.

## Composition des pages

Le shell utilise la composition Sidebar inset de Spartan : topbar `h-14`, Breadcrumb, navigation Command, canvas `bg-muted/40` et padding uniforme `p-4`.

Une page applicative suit cette structure :

1. conteneur vertical `flex flex-col gap-4` ;
2. `app-page-header` pour le titre, la description et les actions ;
3. contenu composé avec Card, `app-table` ou les états Spartan adaptés ;
4. grilles responsives et actions compactes sur mobile.

Le titre principal reste directement sur le canvas. Une Card borne un contenu qui forme réellement un panneau.

```html
<section class="flex flex-col gap-4">
  <app-page-header [title]="'conversations.title' | translate" [description]="'conversations.description' | translate">
    <button hlmBtn type="button">
      <ng-icon name="lucidePlus" />
      <span class="sr-only sm:not-sr-only">{{ 'conversations.actions.create' | translate }}</span>
    </button>
  </app-page-header>

  <app-table [callBackDataFetch]="fetchConversations">
    <ng-template #headerTemplate>
      <tr hlmTr>
        <th hlmTh>Titre</th>
      </tr>
    </ng-template>
    <ng-template #rowTemplate let-conversation>
      <tr hlmTr>
        <td hlmTd>{{ conversation.title }}</td>
      </tr>
    </ng-template>
  </app-table>
</section>
```

## Compositions usuelles

- action : Button et ses variantes ;
- panneau : Card avec Header, Content et Footer ;
- action de ligne : Dropdown Menu ;
- confirmation destructive : Alert Dialog ;
- formulaire : Field avec le contrôle adapté ;
- chargement structurel : Skeleton ;
- chargement d'une action courte : Spinner ;
- absence de données : Empty ;
- erreur contextualisée : Alert ;
- notification transitoire : Sonner ;
- navigation rapide : Command ;
- contenu dépliable : Collapsible ;
- choix exclusif court : Toggle Group en mode `single`.

Dialog, Sheet et Alert Dialog possèdent toujours un titre accessible. Avatar possède toujours un fallback. Une action uniquement iconographique possède toujours un libellé accessible.

## Composites applicatifs

- `app-breadcrumb` construit la navigation depuis `data.breadcrumb` et compose Breadcrumb ;
- `app-navigation-command` transforme le menu en palette Command ;
- `app-page-header` porte le contrat commun du titre, de la description et des actions ; il rend un `h1` par défaut et accepte le niveau `2` uniquement pour une section enfant ;
- `app-table` porte la liste paginée côté serveur et compose les primitives Spartan adaptées.

Les composants d'action, de formulaire, de modale et de confirmation se composent directement avec les primitives Spartan. Les composants UI ne réalisent aucun appel HTTP et n'accèdent pas directement au store.

## Icônes

Lucide est l'unique bibliothèque d'icônes :

- importer les icônes depuis `@ng-icons/lucide` ;
- les enregistrer au plus près du composant avec `provideIcons(...)` ;
- les rendre avec `<ng-icon name="lucide…" />` ;
- associer un texte `sr-only` à toute action uniquement iconographique.

```html
<button hlmBtn type="button" variant="ghost" size="icon">
  <ng-icon name="lucidePencil" />
  <span class="sr-only">Modifier</span>
</button>
```

## Documentation spécialisée

- `webfront/docs/ui/forms.md` : choix de l'API Angular et composition des formulaires ;
- `webfront/docs/ui/app-table.md` : contrat des listes paginées côté serveur ;
- `webfront/docs/architecture/routing.md` : shell, menu, Breadcrumb et routes.
