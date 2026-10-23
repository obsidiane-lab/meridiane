# Routes du playground

Le shell Foundation expose les pages de test Conversation/Message sans guard de connexion. La route racine mène à `/conversations`, qui rassemble la liste de conversations, leurs messages et le chargement individuel par IRI.

Les pages métier vivent dans `modules/`, les erreurs sous `/errors`. Le catalogue `/uikit` a été retiré pour garder le parcours de test ciblé. Les segments restent au pluriel, avec `:id` pour les écrans individuels. Les menus et breadcrumbs utilisent leurs clés de traduction.

Un identifiant de route est converti en IRI avant le chargement par le service. Les composants lisent les signaux retournés et libèrent les abonnements lors du changement d'écran.

Les routes `/login`, `/logout` et le CRUD Project de Foundation ont été retirés.
