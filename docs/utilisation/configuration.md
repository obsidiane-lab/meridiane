# Configuration (`models.config.js`, `.env`, debug)

Cette page fait partie des docs d’utilisation.

Meridiane supporte une configuration “à deux niveaux” :

- un fichier `models.config.js` versionné, pour les defaults partagés
- des variables d’environnement, pour les valeurs qui changent selon les environnements (local/CI)

## `models.config.js`

Le générateur de models charge automatiquement `models.config.js` depuis le dossier courant ou un dossier parent.
Le fichier est en CommonJS (`module.exports = { ... }`) afin d’éviter les warnings Node dans la plupart des workspaces Angular.

Le rôle de ce fichier est de définir des defaults raisonnables :

- dossier de sortie
- chemin d’import de `Item`
- stratégie `requiredMode`

## `.env`

Le CLI charge automatiquement `.env` depuis le dossier courant ou un dossier parent.
Ce mécanisme sert à éviter la répétition des flags dans les scripts locaux et à faciliter l’injection des valeurs en CI.

Variables utiles :

- `MERIDIANE_DEBUG=1`
- `MERIDIANE_LIB_VERSION=0.1.0`
- `MERIDIANE_NPM_REGISTRY_URL=https://…`
- `MERIDIANE_MODELS_OUT=projects/<lib-name>/src/models`
- `MERIDIANE_MODELS_REQUIRED_MODE=spec`
- `MERIDIANE_MODELS_ITEM_IMPORT=../lib/ports/resource-repository.port`
- `MERIDIANE_MODELS_NO_INDEX=1`
- `MERIDIANE_DEV_BACKEND=http://localhost:8000` (pour `dev-bridge`)
- `MERIDIANE_DEV_SPEC=/api/docs.json` (pour `dev-bridge`)
- `MERIDIANE_DEV_WORKSPACE=apps/sandbox` (pour `dev-bridge`)
- `MERIDIANE_SANDBOX_BRIDGE_VERSION=0.1.0` (pour `sandbox-bridge`)

## Ordre de priorité

Les valeurs sont résolues dans l’ordre suivant :

- flags CLI
- `models.config.js`
- `.env`
- valeurs par défaut

## Debug

`--debug` active des logs supplémentaires côté CLI.
`MERIDIANE_DEBUG=1` active le même mode.

Pour le runtime Angular du bridge, le debug est contrôlé par `provideBridge({ debug: true })`.
