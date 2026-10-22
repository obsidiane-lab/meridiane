# Politique de memoire durable

## Principe

La documentation durable est exceptionnelle. Elle sert a transmettre une regle reutilisable aux futurs projets derives du template, pas a journaliser chaque livraison.

## Mettre a jour la doc durable seulement si

- convention d'architecture nouvelle ou modifiee ;
- contrat public structurant ;
- regle de securite, auth, ownership ou tenant ;
- pattern backend/frontend/SSE/bridge reutilisable ;
- convention de delivery agentique ;
- connaissance metier qui sera necessaire a plusieurs features ;
- contradiction corrigee dans la documentation ;
- demande explicite de l'utilisateur.

## Ne pas documenter durablement par defaut

Aucune mise a jour durable pour : CRUD standard, page simple, ajout de champ, bugfix local, refactor borne, ajustement de style ou changement deja couvert par une recette.

## Decision d'architecture

Utiliser `docs/project/architecture-decisions.md` seulement pour une decision structurante, transverse, couteuse a inverser ou controversee. Une decision evidente couverte par une recette ne doit pas etre journalisee.

## Sortie finale

Si aucun declencheur durable n'existe, terminer par : `Documentation durable : non necessaire`.
