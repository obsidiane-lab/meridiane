# Tutoriel CI/CD (pipeline)

Cette page fait partie des docs d’utilisation.

Ce tutoriel illustre un pipeline “classique” pour un repo qui publie un package bridge.
L’objectif est d’obtenir un artefact publiable dans `dist/<lib-name>` après build.

Le point important en CI est la lisibilité : on privilégie des arguments explicites et des variables CI.

## Variables typiques

Selon votre CI, vous aurez souvent :

- `OPENAPI_SPEC_URL` (ou un fichier `openapi.json` dans le repo)
- `NPM_PACKAGE_NAME` (ex: `@acme/backend-bridge`)
- `LIB_VERSION` (ex: `0.1.0`)

## Exemple de job (script)

```bash
npm ci

# Génère + build + npm pack
npx -y @obsidiane/meridiane@0.1.0 build "$NPM_PACKAGE_NAME" --version "$LIB_VERSION" --spec "$OPENAPI_SPEC_URL" --preset=native

# Publish (selon votre stratégie)
# npm publish dist/<libName>
```

## Notes importantes

- Le build d’une lib Angular nécessite `ng-packagr` dans le workspace.
- Si la spec n’est pas disponible en CI, vous pouvez générer depuis un `openapi.json` versionné dans le repo.
- La publication npm dépend de votre stratégie (tags, protections, token). Ce tuto s’arrête volontairement avant `npm publish`.
