# Choix de pattern d'architecture

## Quand lire cette carte

Lire cette carte seulement si une tache revele une odeur concrete :

- service trop gros ;
- duplication durable ;
- gros `if/switch` qui grandit par type, statut, provider ou mode ;
- workflow d'etat ;
- integration externe ;
- creation complexe ;
- pipeline de validation, enrichissement ou resolution ;
- action differee ou effet rejouable ;
- instrumentation autour d'un service stable.

Ne pas lire cette carte pour un CRUD, une page Angular, un endpoint API Platform
ou un formulaire standard deja couvert par les recipes.

## Priorite Foundation

Avant un pattern generique, verifier si un pattern Foundation suffit :

- Entity ou DTO `ApiResource` ;
- provider/processor utile ;
- Voter ;
- extension Doctrine ou ownership ;
- Messenger/Scheduler ;
- repository/service/store Angular ;
- AppTable, composition applicative Spartan ;
- classe de formulaire Angular ;
- Mercure/SSE ;
- service applicatif simple.

Ne jamais remplacer `store -> repository -> service -> composant` par une
abstraction generique.

## Choix usuels

- Strategy : plusieurs algorithmes varient selon type, mode, statut, provider ou
  option.
- Adapter : contrat externe, SDK, API tierce, import/export ou provider qui ne
  doit pas fuir dans le domaine.
- Decorator : cache, logs, metriques, audit, retry ou comportement transversal
  autour d'un service stable.
- Chain of Responsibility : pipeline de validation, enrichissement ou resolution
  progressive ou chaque etape peut gerer ou passer.
- State ou Symfony Workflow : cycle de vie avec transitions, permissions ou
  effets metier.
- Factory : creation complexe ou dependante du contexte, si un constructeur ou
  une methode nommee ne suffit plus.
- Command/Message : action differee, rejouable, asynchrone ou declenchee hors
  requete HTTP.

## Justification attendue

Si un pattern est retenu, justifier en une phrase :

```text
Odeur observee : <fait concret>. Pattern retenu : <nom>. Raison : <pourquoi le pattern Foundation simple ne suffit pas>.
```

Si aucune odeur concrete n'existe, rester sur le pattern Foundation standard et
ne pas ajouter de pattern GoF.
