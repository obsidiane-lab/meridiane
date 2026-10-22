# Validation par sources officielles

## Principe

Verifier les sources officielles quand une decision depend d'un comportement externe ou d'une version. Ne pas declencher une recherche documentaire pour chaque CRUD, page ou bugfix interne deja couvert par les recettes Foundation.

## Verification obligatoire

Utiliser une source officielle recente si la tache touche :

- API Platform, Symfony, Doctrine, Mercure, Angular, Spartan, RxJS ou TypeScript quand la version ou le comportement compte ;
- contrat API public, OpenAPI generee, bridge ou SSE custom ;
- authentification, autorisation, ownership, donnees sensibles ;
- contradiction entre la documentation du template et le code ;
- demande explicite de validation par source.

## Verification non obligatoire

Pas de recherche externe par defaut pour :

- CRUD interne standard ;
- ajout de champ couvert par un pattern existant ;
- page frontend simple ;
- bugfix local dont le comportement est evident dans le code ;
- mise a jour de texte sans impact framework.

## Sources prioritaires

Frameworks :

- API Platform : `https://api-platform.com/docs/`
- Symfony : `https://symfony.com/doc/`
- Doctrine : `https://www.doctrine-project.org/projects/doctrine-orm/en/current/`
- Angular : `https://angular.dev/`
- Spartan : skill local `spartan`, puis `https://spartan.ng/`
- RxJS : `https://rxjs.dev/`
- Mercure : `https://mercure.rocks/`
- OpenAPI : `https://spec.openapis.org/oas/latest.html`

## Sortie attendue

Quand des sources ont ete consultees, la reponse finale doit dire : source consultee, regle validee, impact sur le diff. Quand aucune source n'etait necessaire, ne rien ajouter artificiellement.
