# Mercure 1.0

Voir la [documentation et la migration Meridiane 3.0](../../../../docs/temps-reel.md).

Le playground traite directement les payloads natifs Mercure dans ses repositories. `isResourceDeletion` reconnaît une suppression pour retirer la ressource par son `@id` ; les autres payloads sont conservés avec `upsert`. Les relations restent des IRI ; le backend de cette application gère les publications liées aux conversations et messages.
