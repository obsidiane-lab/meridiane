# Pattern cards Foundation

Lire uniquement les cartes necessaires a la tache. Une recette ne doit pas ouvrir tout ce dossier.

Commencer par le mecanisme natif le plus simple compatible avec le besoin. Ouvrir une carte seulement si le choix n'est pas evident ou si une derive d'architecture est en cause.

## Backend

- `backend/entity-api-resource.md` : contrat Doctrine proche du modele.
- `backend/dto-api-resource.md` : contrat public, sensible, stable ou divergent.
- `backend/ownable.md` : ressource privee par utilisateur.
- `backend/provider-processor.md` : lecture/ecriture non standard.
- `backend/async-messenger-scheduler.md` : queue, batch, worker ou tache periodique.
- `backend/voter.md` : autorisation objet-centree.

## Frontend

- `frontend/store-repository-service-component.md` : feature Angular data-driven.
- `frontend/entity-resource-signal.md` : detail, edition ou action sur une entite par IRI.
- `frontend/reactive-form.md` : formulaire CRUD ou multi-champs.
- `frontend/app-table.md` : liste paginee standard composee avec Spartan.

## Transverse

- `bridge/contract-generation.md` : contrat API visible ou typing bridge.
- `realtime/sse-mercure.md` : temps reel, topic ou CRUD visible.

## Architecture

- `architecture/pattern-choice.md` : choisir un pattern seulement face a une odeur concrete.

## Refactoring

Refactorer seulement si le code existant montre une odeur concrete : logique reseau dans composant, bridge modifie a la main, provider pass-through, Voter vide, duplication durable, contrat faux, fuite de securite, subscription non bornee, workflow d'etat ou integration externe qui fuit dans le domaine.

La documentation durable est geree par `docs/project/durable-memory-policy.md` et la verification par `.codex/guides/verification-contract.md`.
