# Recette - Auth, securite et ownership

## Quand utiliser

Login, logout, session, role, organisation, ownership, tenant, autorisation API, XSRF, OIDC, Logto, donnees sensibles.

## Lire d'abord

1. `core/AGENTS.md`
2. `webfront/AGENTS.md` si UI auth touchee
3. `.codex/patterns/backend/ownable.md` si ressource privee par utilisateur
4. `core/docs/security/ownership.md`
5. `core/docs/api/auth.md` ou `webfront/docs/standards/auth.md` selon scope
6. `.codex/guides/source-validation.md` si un comportement externe/version compte

## Pattern a appliquer

- Le backend porte l'autorisation reelle.
- Le frontend orchestre la session et l'UX, mais ne devient pas la barriere principale.
- Collection et item doivent etre coherents.
- Ressource ownable : filtrer en Doctrine pour eviter les fuites avant hydratation/serialization.
- Donnee invisible hors perimetre : protection structurelle de lecture ; Ownable si le perimetre est l'utilisateur.
- Voter pour les actions/metiers sur ressources partagees, visibles dans le bon perimetre ou contextualisees.
- Pas de token OIDC manipule directement cote frontend hors mecanismes existants.
- Ownership/tenant explicites si donnees isolees.

## Checks

- `make phpstan`
- `make lint && make build` si frontend touche
- review humaine recommandee si donnees sensibles ou autorisation change

## Documentation durable seulement si

Nouvelle regle de securite, changement d'auth, nouvelle convention ownership/tenant ou modification du modele d'autorisation.
