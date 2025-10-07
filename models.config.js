// Configuration de la génération des modèles (modifiable à volonté)

export default {
  // Dossier de sortie des modèles (relatif au CWD)
  outDir: 'projects/backend-bridge/src/models',

  // Chemin d'import de l'interface Item dans les fichiers générés
  itemImportPath: '../lib/ports/resource-repository.port',

  // Optionnalité des propriétés
  // - 'all-optional': toutes les propriétés sont marquées optionnelles (par défaut)
  // - 'spec': respecte les champs 'required' de la spec OpenAPI
  requiredMode: 'spec',

  // Préférence entre les variantes de schémas
  // - 'jsonld' (défaut) | 'jsonapi' | 'none'
  preferFlavor: 'jsonld',

  // Schémas Hydra de base à ignorer (merge allOf + filtrage)
  hydraBaseRegex: /^Hydra(?:Item|Collection)BaseSchema$/,
};

