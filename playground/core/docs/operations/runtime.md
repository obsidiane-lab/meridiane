# Runtime local

Caddy sert le frontend, `/api` et `/.well-known/mercure` sous `http://localhost:8000`. Le serveur Angular est aussi accessible sur `http://localhost:4200`.

Les conteneurs se joignent par leurs noms de services : `core`, `webfront` et `database`. MariaDB reste sur `database:3306` en interne, sans port hôte exposé.

Le frontend charge la configuration runtime `assets/config.json` avant le bootstrap. La stack n'utilise ni fournisseur OIDC ni session de connexion.

Voir [l'environnement](../../../docs/root-env.md) et le [README](../../../README.md).
