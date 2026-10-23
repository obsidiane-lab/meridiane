# Base de développement

Le playground utilise une base MariaDB dédiée, gérée par `compose.yaml`.

Les anciennes migrations Foundation ont été retirées avec les ressources d'authentification et Project. `make init` prépare le schéma local de Conversation/Message. Ce parcours concerne uniquement des données de test.

Ne pas réutiliser le volume d'une application Foundation réelle avec cette configuration. Toute remise à zéro doit rester explicite ; un redémarrage normal de la stack conserve les données.
