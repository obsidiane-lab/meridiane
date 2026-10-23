# Skills, recipes, references et patterns

## Principe

Les skills visibles sont des competences de livraison. Les technologies sont des
references techniques chargees a la demande.

```text
Skill = intention utilisateur / competence de livraison.
Recipe = procedure projet.
Reference = detail technique sur un outil.
Pattern = forme de conception attendue.
AGENTS.md = invariants non negociables.
```

## Skills

Un skill couvre un job repetable et correspond au langage utilisateur :

- feature metier transverse ;
- parcours webapp, page, CRUD, formulaire, listing ;
- backend API, ressource, service ou persistence ;
- frontend Angular et UX ;
- contrat API, OpenAPI ou bridge ;
- realtime ou async ;
- securite ;
- debug/refactor ;
- review ;
- upgrade/source validation ;
- documentation projet durable.

Un skill visible ne doit pas etre seulement le nom d'une technologie. Les
contenus techniques vivent dans les recipes, pattern cards, `core/docs/`,
`webfront/docs/` ou references du skill concerne.

## Recipes

Une recipe est courte et procedurale. Elle indique quand l'utiliser, quoi lire,
le workflow, les pattern cards, les checks et l'eventuelle documentation
`docs/project/`.

Une tache standard lit une seule recipe principale. Une deuxieme recipe est
acceptable seulement si deux axes dominent vraiment la demande, par exemple
feature webapp + securite.

## References

Une reference technique est lue seulement apres choix du skill et de l'outil.

Pour une UI Angular, la repartition est stricte :

- `webfront/docs/ui/spartan.md` porte la convention UI durable unique ;
- `webfront/AGENTS.md` impose sa lecture et protege les frontieres generees ;
- le skill technique `spartan` orchestre le workflow et la verification des API ;
- les recipes et patterns ajoutent seulement leur contexte metier ou architectural, sans recopier la doctrine UI.

Format recommande :

```md
# Sujet

## Lire cette reference quand

## Ne pas utiliser quand

## Pattern Foundation

## Fichiers a inspecter

## Implementation attendue

## Pieges courants

## Checks
```

Les conventions deja couvertes par `.codex/patterns/`, `core/docs/` ou `webfront/docs/` ne doivent
pas etre recopiees dans un skill. Un skill technique peut conserver uniquement le routage, les
outils de verification et les precautions propres a son execution.

## Chemin standard

1. Lire `AGENTS.md`.
2. Choisir un skill principal.
3. Lire une recipe principale.
4. Lire `core/AGENTS.md` ou `webfront/AGENTS.md` si le scope est touche.
5. Charger le skill technique complementaire si la technologie touchee le demande.
6. Lire les pattern cards utiles.
7. Lire les references techniques necessaires.
8. Inspecter le code equivalent.
9. Utiliser les generateurs natifs quand ils couvrent le besoin.
10. Implementer, relire le code genere et verifier.
