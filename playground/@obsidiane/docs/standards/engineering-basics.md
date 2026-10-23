# Engineering basics

Conventions shared minimales pour les projets Obsidiane.

## Principes
- lisibilite > cleverness ;
- solution la plus simple compatible avec le besoin ;
- petits changements, verification frequente ;
- consistance locale avant abstraction ;
- pas de future-proofing non justifie.

## Architecture et API
- separer UI, orchestration, acces aux donnees et logique metier ;
- preferer les mecanismes natifs des frameworks avant d'ajouter une couche ;
- API : ressources stables, codes HTTP corrects, erreurs structurees, pagination et filtres coherents ;
- ne pas dessiner l'API uniquement pour un ecran.

## Securite et configuration
- least privilege par defaut ;
- ne jamais exposer ni logger des secrets ;
- config sensible dans l'environnement, jamais en dur ;
- l'autorisation fine reste cote backend.

## Qualite et exploitation
- backend : `phpstan` sur les changements applicatifs ;
- frontend : `lint`, `build` sur les changements applicatifs ;
- timeouts, logs utiles et garde-fous de performance sur les zones critiques ;
- pas de suppression de checks sans raison explicite.

## Delivery
- la demande doit etre traduite en objectif, contraintes et done when ;
- un plan est requis si le travail n'est pas local et evident ;
- une decision durable doit remonter dans la doc projet ;
- une tache n'est pas finie sans preuve proportionnee.
