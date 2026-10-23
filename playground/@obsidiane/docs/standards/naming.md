# Conventions de nommage (generales)

## Casing recommande
- Classes / Types : PascalCase
- Variables / fonctions : camelCase
- Constantes : SCREAMING_SNAKE_CASE
- Fichiers : kebab-case (ou convention projet), pas Utils.ts
- Dossiers : kebab-case ou snake_case, mais consistant

## Eviter les "fourre-tout"
- Eviter : utils, helpers, common, misc, manager (sauf cas precis).
- Preferer un nom metier : currency-format, invoice-mapper, booking-policy.

## Stabilite semantique
- Ne pas renommer un concept a moitie.
- Un concept = un nom partout (DB, API, UI, logs).

## Conventions projet (Foundation)
### Backend (core)
- Entite Doctrine : `Conversation` dans `core/src/Entity/Conversation.php`.
- ApiResource dediee optionnelle : `<Entity>Resource` dans `core/src/ApiResource/<Entity>Resource.php`.
- Provider optionnel : `<Entity>Provider` dans `core/src/State/Provider/<Entity>Provider.php`.
- Processor optionnel : `<Entity>Processor` dans `core/src/State/Processor/<Entity>Processor.php`.
- Voter optionnel : `<Entity>Voter` dans `core/src/Security/Voter/<Entity>Voter.php`.
- Ces classes optionnelles ne sont creees que si la matrice de decision les justifie.

### Frontend (webfront)
- Store : `ConversationStore` dans `webfront/src/app/modules/dashboard/stores/conversation.store.ts`.
- Repository : `ConversationRepository` dans `webfront/src/app/modules/dashboard/repositories/conversation.repository.ts`.
- Service : `ConversationService` dans `webfront/src/app/modules/dashboard/services/conversation.service.ts`.
- Formulaire : `ConversationForm` dans `webfront/src/app/modules/dashboard/forms/conversation.form.ts`.
- Routes : kebab-case, collection au pluriel : `/conversations`, detail `/conversations/:id`.
- `:id` reste une string : convertir en IRI avant d'appeler le service, qui delegue au repository (ex: `/api/conversations/${id}`).
- Components : `conversation-list.component.ts`, `conversation-detail.component.ts`, `conversation-edit.component.ts`.

### I18n (webfront)
- Namespace recommande : `entities.conversation`.
- Exemples :
  - `entities.conversation.title`
  - `entities.conversation.fields.title`
  - `entities.conversation.actions.create`
  - `entities.conversation.breadcrumbs.list`
  - `menu.items.conversations.title`
