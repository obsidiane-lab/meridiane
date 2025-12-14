# Versioning & releases

Meridiane est versionné via des **tags git** au format **SemVer** : `MAJOR.MINOR.PATCH` (ex: `1.0.0`).

## Comment une version est créée

Deux chemins :

- **Automatique (recommandé)** : à chaque push sur `master`, le workflow `Release` calcule un bump, pousse un nouveau tag, puis publie sur npm.
- **Manuel** : tu crées/pousses un tag `X.Y.Z` (utile pour une première `1.0.0` ou un cas exceptionnel) et le workflow `Release` publie sur npm.

Le publish npm utilise exactement la même version que le tag (le tag **sans préfixe** `v`).

## Convention de commits (bump MAJOR / MINOR / PATCH)

Le workflow de tag utilise `mathieudutour/github-tag-action` avec `default_bump: patch`.

Règles à suivre :

- **MAJOR** (breaking change)
  - commit avec `#major` dans le message, ou
  - commit Conventional Commits avec `!` (ex: `feat!: ...`), ou
  - mention `BREAKING CHANGE:` dans le corps du commit.
- **MINOR** (feature compatible)
  - commit avec `#minor`, ou
  - `feat: ...`
- **PATCH** (fix compatible)
  - commit avec `#patch`, ou
  - `fix: ...`
- Si rien ne matche, le bump par défaut est **PATCH** (car `default_bump: patch`).

Exemples :

```text
fix(cli): improve OpenAPI error message
```

```text
feat(models): add contract-driven `--formats` generation
```

```text
feat(runtime)!: change provideBridge options

BREAKING CHANGE: rename `mercure.init` to `mercure.requestInit`
```

## Créer `1.0.0` en tag (manuel)

Important : tes workflows attendent un tag **sans `v`**.

```bash
git checkout master
git pull origin master

git tag -a 1.0.0 -m "Release 1.0.0"
git push origin 1.0.0
```
