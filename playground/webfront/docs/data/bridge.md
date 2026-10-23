# Bridge Meridiane local

Depuis `playground/`, exécuter :

```bash
make bridge
```

La commande utilise les sources de `../packages/meridiane/` et le contrat OpenAPI du backend playground. Elle produit `webfront/bridge/`, puis prépare sa consommation par Angular. Elle ne télécharge pas une ancienne version du générateur sur npm.

Ne jamais modifier cette sortie à la main ni dupliquer localement les types des modèles générés. Toute évolution des entités visibles impose une nouvelle génération.

La documentation publique fait référence dans le dépôt Meridiane : [API](../../../../docs/reference.md), [HTTP](../../../../docs/http.md), [Mercure 1.0](../../../../docs/temps-reel.md).
