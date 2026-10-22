# Commandes backend

Depuis `playground/` :

```bash
make init
make bridge
make phpstan
```

Pour consulter le contrat et la configuration du backend :

```bash
docker compose exec core php bin/console debug:router
docker compose exec core php bin/console cache:clear
```

`make init` prépare le schéma de cette application locale. Les migrations et les données Project du template ne sont pas reprises.
