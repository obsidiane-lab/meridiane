# Dérivation Foundation du playground

Source : [angryblackbird/foundation](https://gitlab.com/angryblackbird/foundation), commit `fecf8e7`.

Le playground conserve la structure `core/`, `webfront/` et `@obsidiane/`. L'authentification et les données de démonstration Project ont été remplacées par Conversation/Message. Les anciennes migrations ne sont pas reprises.

La configuration locale est décrite dans [le README](../../README.md). Le bridge provient des commandes locales Meridiane ; il ne doit pas être modifié manuellement.

Le socle `.codex/` et `.agents/` est conservé depuis le template. Ses exemples restent des références génériques, pas une liste des fonctionnalités du playground.
