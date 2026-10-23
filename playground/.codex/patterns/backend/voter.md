# Pattern - Voter Symfony

## Utilise quand

La decision depend d'un sujet concret et doit etre reutilisee : statut, organisation, transition, permission objet-centree, role metier ou action contextualisee.

Le sujet peut etre visible dans le contexte courant, mais toutes les actions ne sont pas forcement permises.

## N'utilise pas quand

Un simple role, une restriction Doctrine ou une regle d'operation suffit.

Ne pas utiliser un Voter comme protection principale d'une ressource invisible hors perimetre par nature. Dans ce cas, preferer une protection structurelle de lecture avant exposition : Ownable si le perimetre est l'utilisateur, ou une approche equivalente si le perimetre est tenant, organisation, workspace, equipe ou partition metier.

## Emplacement

`core/src/Security/Voter/<Name>Voter.php`

## Squelette mental

- Attributs nommes metier.
- Sujet type explicitement controle.
- Refuser par defaut.
- Collection et item restent coherents via restriction Doctrine ou operation security.
- Si la collection doit etre invisible pour certains utilisateurs, filtrer avant le Voter.

## Checks

`make phpstan`; verification manuelle si regle sensible ; review si donnees sensibles.

## Anti-patterns

Voter vide, Voter qui duplique un role global, logique frontend comme seule barriere, oubli de filtrage collection, Voter utilise pour masquer a posteriori une donnee qui aurait du etre filtree par Ownable ou une protection structurelle de perimetre.
