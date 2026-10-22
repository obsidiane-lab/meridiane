---
name: spartan
description: >-
  Utilise spartan/ui dans le webfront Angular Foundation : selection, generation CLI, composition,
  formulaires, icones Lucide, theme light/dark et verification des composants.
user-invocable: false
allowed-tools:
  - Bash(npm run ng -- generate @spartan-ng/cli:*)
---

# spartan/ui dans Foundation

Ce skill orchestre l'usage de Spartan sans redefinir la convention UI du projet.

## Contexte obligatoire

Pour toute interface visible :

1. lire `webfront/AGENTS.md` ;
2. lire integralement `webfront/docs/ui/spartan.md`, source durable unique pour l'UI ;
3. lire seulement la documentation specialisee necessaire, par exemple `webfront/docs/ui/forms.md`
   ou `webfront/docs/ui/app-table.md`.

## Workflow

1. Inspecter la composition applicative equivalente la plus proche.
2. Confirmer le selecteur, les imports, les entrees, les variants et l'accessibilite dans les sources
   Spartan selon `mcp.md` ; ne pas deviner une API.
3. Inspecter les primitives installees avec la commande `info` donnee dans la section CLI de la
   convention UI.
4. Reutiliser une primitive presente. Si elle manque, suivre exactement le workflow de generation de
   cette meme section.
5. Composer la page ou le composant applicatif en appliquant la convention UI, sans ecrire dans la
   sortie Helm generee.
6. Executer le healthcheck prescrit si Spartan a ete genere ou mis a niveau, puis lint et build ;
   ne pas creer ni generer de tests unitaires.

Les fichiers `cli.md` et `rules/*.md` routent uniquement vers les sections canoniques et ne portent
aucune doctrine parallele.
