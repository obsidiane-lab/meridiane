// Exemple de configuration pour la génération des modèles
// Renommez ce fichier en `models.config.js` à la racine du repo pour l'activer.

export default {
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

  // Hydra: regex pour les schémas de base à ignorer (merge allOf / filtrage)
  // Peut être une RegExp ou une string passée à `new RegExp(...)`
  hydraBaseRegex: /^Hydra(?:Item|Collection)BaseSchema$/,
};

