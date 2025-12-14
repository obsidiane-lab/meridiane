// Exemple de configuration pour la génération des modèles.
// Copiez ce fichier en `models.config.js` dans le dossier où vous lancez la commande (`meridiane models`).
// Format CommonJS pour éviter les warnings Node dans la plupart des workspaces Angular.

module.exports = {
  // Dossier de sortie (relatif au CWD)
  outDir: 'projects/backend-bridge/src/models',

  // Chemin d'import de `Item` dans les templates (relatif au fichier généré)
  itemImportPath: '../lib/ports/resource-repository.port',

  // Contrôle des propriétés optionnelles
  // - 'all-optional': toutes les props sont optionnelles
  // - 'spec': respecte le tableau `required` de la spec
  requiredMode: 'all-optional',

  // Préférence entre variantes de schémas (.jsonld, .jsonapi ou aucune)
  // Valeurs possibles: 'jsonld' | 'jsonapi' | 'none'
  preferFlavor: 'jsonld',

  // Preset de génération:
  // - 'all' (défaut): génère tout ce qui ressemble à un objet
  // - 'native': exclut les schémas "techniques" (Hydra*, jsonMergePatch…)
  preset: 'all',

  // Générer `index.ts` dans le dossier des models
  writeIndex: true,

  // Filtres additionnels (sur les noms OpenAPI des schémas, ex: "User-user.read", "Conversation.jsonMergePatch")
  // - includeSchemaNames: si non vide, ne garde que les matchs
  // - excludeSchemaNames: supprime les matchs
  // Règles possibles: RegExp, string (substring), ou (name) => boolean.
  includeSchemaNames: [],
  excludeSchemaNames: [],

  // Hydra: regex pour les schémas de base à ignorer (merge allOf / filtrage)
  // Peut être une RegExp ou une string passée à `new RegExp(...)`
  hydraBaseRegex: /^Hydra(?:Item|Collection)BaseSchema$/,
};
