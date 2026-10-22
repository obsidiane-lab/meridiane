# Sources Spartan pour les agents

Avant d'utiliser un composant, confirmer son selecteur, ses imports, ses entrees, ses variants, sa
composition et ses contraintes d'accessibilite. Ne pas deviner une API.

## MCP Spartan disponible

Si le serveur `@spartan-ng/mcp` est connecte, utiliser en priorite :

- `spartan_components_list` pour trouver la primitive native ;
- `spartan_components_get` avec `extract: "api"` pour les selecteurs et entrees ;
- `spartan_components_get` avec `extract: "code"` pour un exemple de composition ;
- `spartan_components_dependencies` pour les dependances generees ;
- `spartan_accessibility_check` pour les contraintes ARIA et clavier ;
- `spartan_health_check` pour une maintenance ou une mise a jour Spartan.

Les blocks peuvent servir de reference de composition, jamais de code a copier dans `shared/ui/**`.

## Sans MCP

Consulter la documentation officielle `https://www.spartan.ng/components/<name>` et la sortie de :

```bash
npm run ng -- generate @spartan-ng/cli:info --json
```

Les exemples officiels donnent la structure et l'API. Appliquer ensuite la convention unique
`webfront/docs/ui/spartan.md`.
