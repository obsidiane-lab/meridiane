# Socle Codex Foundation

Ce dossier contient le contrat agentique statique du template Foundation :
recipes, patterns, guides, examples, rules, subagents et configuration Codex.

Il est destine a etre lu par Codex. Les workflows applicatifs lisent ce socle ;
ils ne le modifient pas sauf evolution explicite du template agentique.

## Chemin standard

1. `AGENTS.md`
2. skill principal `.agents/skills/obsidiane-*`
3. recipe `.codex/recipes/`
4. `core/AGENTS.md` ou `webfront/AGENTS.md` si le scope est touche
5. skill technique complementaire si la technologie touchee le demande
6. pattern cards utiles
7. example ou code existant equivalent
8. generateur natif pertinent si disponible
9. fichiers modifies
10. check minimal

Ne pas lire tout `.codex/` par reflexe.

## Regle des generateurs

Avant d'ecrire du boilerplate a la main, utiliser le generateur framework prevu
des qu'il existe et peut tourner :

- Symfony/MakerBundle pour les artefacts backend couverts par `make:*` ;
- Doctrine pour les migrations avec `php bin/console d:m:diff` ;
- Angular CLI pour composant, service, guard, pipe, directive, classe ou
  interface quand le schematic couvre le besoin ;
- Spartan CLI pour ajouter une primitive UI absente ;
- `make bridge` quand le contrat API visible change.

Relire le resultat, puis adapter au pattern Foundation. Si la commande est
absente, impossible a executer ou inadaptee, le signaler en sortie.

## Structure

- `config.toml` : configuration projet Codex sans secrets ni provider machine.
- `agents/` : subagents lecture seule pour recherche documentaire et review.
- `recipes/` : procedures courtes de livraison par type de tache.
- `patterns/` : formes de conception attendues par couche.
- `examples/` : exemples canoniques a lire seulement si le code reel ne suffit
  pas.
- `guides/` : contrats transverses de source validation, skills et verification.
- `rules/` : politique de commandes sensibles.

## Doctrine

Les skills visibles sont des competences de livraison. Les technologies comme
API Platform, Angular, Spartan, Meridiane, Mercure, Doctrine, Messenger ou OIDC sont des
references techniques rattachees aux recipes et patterns.
