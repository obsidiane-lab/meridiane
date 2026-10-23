# Exemple - formulaire Angular reactif

Squelette generique pour un formulaire CRUD ou multi-champs.

- Form class : `webfront/src/app/modules/<module>/forms/<resource>.form.ts`.
- Composant de formulaire : `webfront/src/app/modules/<module>/components/<resource>-form/`.
- Page creation : `webfront/src/app/modules/<module>/pages/<resource>-create-page/`.
- Page edition : `webfront/src/app/modules/<module>/pages/<resource>-edit-page/`.
- Utilitaires : `webfront/src/app/core/forms/form.type.ts` et `validation-error-message.util.ts`.

## Regle d'imitation

Pour un CRUD ou un formulaire multi-champs avec validation/mapping, creer une classe dediee `forms/*.form.ts` qui implemente `FormType`.

Cette classe porte tous les controles, validators, valeurs par defaut, `reset()` et `persist()`. Le composant de formulaire recoit le `FormGroup`, compose les champs avec `hlmField`, le controle Spartan adapte et `hlm-field-error`, puis emet le submit. La page recupere le payload via `persist()` et appelle le service.
