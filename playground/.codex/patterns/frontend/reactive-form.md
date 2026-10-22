# Pattern - formulaire Angular reactif

## Utilise quand

CRUD avec creation/edition, formulaire metier partage, ou formulaire a plusieurs champs avec validation, mapping, valeurs par defaut ou reset non triviaux.

Un formulaire local tres simple et sans logique metier peut rester dans le composant, mais il ne doit pas servir de modele pour un CRUD.

## Emplacements

```text
webfront/src/app/modules/<module>/
  forms/<name>.form.ts
  components/<name>-form/
  pages/<name>-create-page/
  pages/<name>-edit-page/
```

## Form class

Modeler le formulaire comme un `FormType` Symfony : une classe dediee decrit les champs, les types, les regles de validation, le reset et le payload.

```ts
@Injectable({ providedIn: 'root' })
export class ResourceForm implements FormType<Resource, ResourceFormValue, ResourceFormGroup> {
  private readonly fb = inject(NonNullableFormBuilder);

  createForm(model: Resource | null): ResourceFormGroup {
    const form = this.fb.group({
      name: this.fb.control('', { validators: [Validators.required, Validators.maxLength(255)] }),
      notes: this.fb.control('', { validators: Validators.required }),
      enabled: this.fb.control(false),
    });

    this.reset(form, model);
    return form;
  }

  reset(form: ResourceFormGroup, model: Resource | null): void {
    form.reset({
      name: model?.name ?? '',
      notes: model?.notes ?? '',
      enabled: model?.enabled ?? false,
    }, { emitEvent: false });
  }

  persist(form: ResourceFormGroup): ResourceFormValue {
    return form.getRawValue();
  }
}
```

## Responsabilites

- `forms/*.form.ts` : declare tous les controles, types, validators, valeurs par defaut, normalisation et mapping vers le payload.
- `components/*-form/` : affiche le formulaire, les erreurs et les actions ; recoit le `FormGroup` en input ; emet `submitted` et `cancelled`.
- Page create/edit : instancie le formulaire, fait `markAllAsTouched()` si invalide, appelle `persist()`, puis transmet au service.
- Service : expose l'action metier appelee par la page.
- Repository : seul endroit qui parle au bridge/HTTP et synchronise le store.

## Payload

- Utiliser le type bridge comme modele de lecture quand il existe.
- Creer un type local de payload si le write model differe du modele lu, par exemple pour exclure `id`, `@id`, champs calcules ou objets UI.
- Ne pas dupliquer un modele bridge pour representer la ressource complete.
- Pour une relation API, stocker ou convertir vers l'IRI attendu par le backend dans `persist()`, sauf contrat explicite different.

## Validation et affichage

- Mettre les validators Angular dans la classe de formulaire, pas eparpilles dans le composant.
- Composer chaque champ avec les primitives Spartan : `hlmField`, `hlmFieldLabel`, le controle Helm adapte et `hlm-field-error`.
- Utiliser les fieldsets Spartan pour les groupes de controles et les variantes natives des composants avant toute classe de presentation.
- Exposer un helper de composant `fieldError()` qui delegue a `controlErrorMessage()` pour traduire les erreurs Angular affichees par `hlm-field-error`.
- Gerer l'erreur de sauvegarde au niveau page/composant de formulaire, sans confondre erreur backend globale et erreur de champ.

```html
<div hlmField>
  <label hlmFieldLabel for="resource-name">Nom</label>
  <input hlmInput id="resource-name" [formControl]="form.controls.name" />
  @if (fieldError('name'); as error) {
    <hlm-field-error forceShow>{{ error }}</hlm-field-error>
  }
</div>
```

## Create/edit

- En creation : `createForm(null)`, validation locale, `persist()`, appel service, navigation.
- En edition : creer le formulaire vide, charger la ressource, puis `reset()` quand la ressource est prete.
- Ne pas reinitialiser un formulaire deja hydrate si cela peut ecraser une saisie utilisateur apres refresh, SSE ou rechargement async.

## Checks

- `make lint`
- `make build`
- Verification manuelle ciblee si la classe de formulaire contient mapping conditionnel, validator custom, relation, normalisation ou reset non trivial.

## Anti-patterns

FormGroup CRUD construit directement dans la page, `form.value` envoye tel quel pour un formulaire metier, validation dispersee dans le template, bridge ou HTTP dans le composant de formulaire, `any` sur les controles, type local dupliquant une ressource bridge, reset qui ecrase une saisie utilisateur.
