---
name: obsidiane-security
description: "Securite Foundation: auth, ownership, tenant, roles, voters, session, XSRF, OIDC ou donnees sensibles."
---

# Securite Foundation

1. Lire `AGENTS.md`.
2. Lire `.codex/recipes/auth-security.md`.
3. Lire `core/AGENTS.md`.
4. Lire `webfront/AGENTS.md` si l'UX auth/session est touchee.
5. Identifier ressource, acteur, operation, perimetre de visibilite et risque.
6. Appliquer la decision de securite cote backend.
7. Ressource ownable : filtrer en Doctrine avant hydratation/serialization.
8. Action metier contextualisee : preferer un Voter si la decision depend du sujet.
9. Ne jamais faire du frontend la seule barriere.
10. Ne pas manipuler directement de token OIDC cote frontend hors mecanismes existants.
11. Executer `make phpstan`, puis checks frontend si guard/session/UI touche.
12. Recommander une review humaine si autorisation ou donnee sensible change.
