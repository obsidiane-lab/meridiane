# Formulaires Angular

## Objectif

Uniformiser les formulaires avec les API Angular et les composants Spartan, sans mélanger plusieurs stratégies dans un même formulaire.

## Choix de l'API

- Signal Forms est le choix par défaut d'un nouveau formulaire quand tous les contrôles Spartan nécessaires sont compatibles ;
- Reactive Forms est le choix adapté aux filtres d'`AppTable` et aux formulaires qui nécessitent explicitement un `FormGroup`, des validateurs ou des flux RxJS, ou un contrôle `ControlValueAccessor` non compatible avec Signal Forms ;
- une feature choisit une seule API par formulaire ;
- le mapping entre modèle, formulaire et payload reste isolé dans `modules/<module>/forms` dès qu'il dépasse une transformation triviale.

## Organisation des Signal Forms

- le modèle éditable est porté par un signal dédié ;
- le schéma de validation et le mapping du payload vivent dans `modules/<module>/forms` ;
- `[formField]` est utilisé uniquement avec un contrôle compatible ;
- le formulaire ne déclare ni `FormGroup`, ni `FormControl`, ni `formControlName`.

## Organisation des Reactive Forms

- chaque entité CRUD possède une classe dans `modules/<module>/forms` ;
- cette classe implémente `FormType` ;
- `createForm` construit le `FormGroup` et ses validateurs ;
- `reset` restaure le formulaire depuis un modèle ;
- `persist` produit le payload transmis au service ;
- les pages de création et d'édition réutilisent cette classe et ne redéclarent pas les validateurs.

Le flux reste `store -> repository -> service -> composant`. La classe de formulaire transforme les valeurs de l'UI ; elle ne réalise pas d'appel HTTP.

## Composition Spartan

- composer chaque contrôle dans `hlmField` avec `hlmFieldLabel`, une description si utile et `hlm-field-error` ;
- utiliser `hlmFieldSet` et `hlmFieldLegend` pour un groupe de choix ;
- choisir `hlmInput`, `hlm-native-select`, Checkbox, Switch ou un autre contrôle Helm selon la sémantique ;
- préférer le select natif pour un choix simple et générer Select ou Combobox seulement si l'interaction l'exige ;
- utiliser les composants comme `ControlValueAccessor` avec `formControlName` lorsqu'ils le supportent ;
- afficher une erreur quand le contrôle a été touché ou quand la soumission a été tentée ;
- utiliser Alert pour une erreur de sauvegarde globale.

```html
<form [formGroup]="form" (ngSubmit)="submit()">
  <div hlmField>
    <label hlmFieldLabel for="conversation-title">Titre</label>
    <input hlmInput id="conversation-title" formControlName="title" />
  </div>
  <button hlmBtn type="submit">Enregistrer</button>
</form>
```

## Bonnes pratiques Angular

- ne pas mélanger Signal Forms, Reactive Forms et formulaires pilotés par le template dans un même formulaire ;
- formulaires typés par défaut ;
- `NonNullableFormBuilder` quand la valeur ne peut pas être nulle ;
- `FormControl<T | null>` quand `null` appartient réellement au domaine ;
- `FormRecord` pour des clés dynamiques ;
- `(ngSubmit)` sur le `<form>` ;
- type explicite sur chaque bouton : `submit` pour l'action principale, `button` pour les autres ;
- i18n pour les libellés, descriptions, erreurs et placeholders visibles.

Les formulaires Conversation/Message utilisent les champs `title` et `content` du contrat généré. Les règles de composition, de thème et de styles sont définies dans `webfront/docs/ui/spartan.md`.
