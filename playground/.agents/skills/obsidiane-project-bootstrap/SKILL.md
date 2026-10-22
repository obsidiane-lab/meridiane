---
name: obsidiane-project-bootstrap
description: "Bootstrap Foundation: derivation projet, nommage, configuration, branding, environnements et conventions."
---

# Bootstrap projet

Utiliser pour transformer le template Foundation en projet reel, renommer le socle, adapter la
configuration initiale, preparer les environnements ou poser les premieres conventions projet.

Lire `AGENTS.md`, `.codex/recipes/project-bootstrap.md`, `.codex/config.toml`,
`docs/project/project-derivation-checklist.md`, puis les fichiers de configuration reellement touches.

Identifier les noms a changer avant d'editer, distinguer socle Foundation et personnalisation projet,
puis limiter le diff aux fichiers necessaires.

Si le branding ou le webfront change, appliquer `webfront/AGENTS.md`,
`.agents/skills/spartan/SKILL.md` et `webfront/docs/ui/spartan.md`. Cette convention porte la
frontiere entre branding, composition applicative et code genere.

Ne jamais modifier `webfront/bridge/` a la main. Si le contrat API change pendant le bootstrap,
corriger le backend puis lancer `make bridge`.

Verifier les secrets et `.env` sans les exposer en sortie. Ne pas inventer de valeurs sensibles ;
laisser des placeholders explicites quand une valeur doit venir de l'environnement.

Finir par une checklist courte : fichiers adaptes, commandes utiles, checks executes ou non executes,
et documentation durable creee seulement si une convention reutilisable a change.
