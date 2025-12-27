# Meridiane — générer un “bridge” Angular pour API Platform

Meridiane est un **CLI** qui génère un **package npm Angular** (“bridge”) à partir d’une spec **OpenAPI** (API Platform).

Un bridge contient :
- un runtime Angular (HTTP/Hydra + facades + helpers) ;
- des models TypeScript (optionnel) ;
- une documentation embarquée (`README.md`) directement dans le package publié.

---

## Ce que fait Meridiane

- Génère une **lib Angular** (bridge) à partir d’un template embarqué.
- Génère des **models TypeScript** depuis une **spec OpenAPI** (API Platform).
- Fournit des helpers runtime :
  - REST (API Platform / Hydra) ;
  - Mercure/SSE (mono-connexion, topics ref-count) ;
  - facades (signals) + interceptors (Content-Type, etc.).

---

## Démarrage rapide

Installation du CLI :

```bash
npm install -D @obsidiane/meridiane
```

Générer en local (développement d’app Angular) :

```bash
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json --formats application/ld+json
```

Générer uniquement les fichiers (monorepo) :

```bash
npx meridiane generate @acme/backend-bridge --spec ./openapi.json --formats application/ld+json
```

Générer en CI (artefact publiable) :

```bash
npx meridiane build @acme/backend-bridge --version 0.1.0 --spec https://staging.example/api/docs.json --formats application/ld+json
```

Le build produit `dist/<libName>` et un `.tgz` via `npm pack` (prêt à publier).

Astuce : `--version` est optionnel ; si omis, Meridiane utilise `0.0.0` (déconseillé pour publier).

Astuce : si vous ne voulez générer que la lib (sans models), utilisez `--no-models` (et `--spec` devient inutile).

Formats :
- `--formats` est répétable (ou liste `,`) et l’ordre est significatif (format primaire en premier), ex: `--formats application/ld+json,application/json`.

---

## À propos des models OpenAPI

La génération est “contract-driven” : Meridiane génère les models TypeScript réellement atteignables depuis les endpoints (`paths`) pour les formats demandés.

Détails et limites : `docs/utilisation.md`.

---

## Workflow cible

Meridiane est optimisé pour ce workflow :

- 1 backend **Symfony / API Platform** → 1 package npm “bridge” (ex: `@acme/backend-bridge`) → n apps Angular.

Deux rôles :
- **Mainteneur** : génère/compile/publie le bridge.
- **Consommateur** : installe le package et configure `provideBridge()` dans l’app.

---

## Ce repo

```
packages/
  meridiane/                    # Paquet publié (@obsidiane/meridiane)
    cli.js                      # Entrypoint CLI
    tools/                      # Génération (dev/build)
    templates/_lib_template/     # Template de librairie Angular (bridge)
apps/
  sandbox/                      # App Angular de dev (non publiée)
    projects/sandbox/           # L'app
    dist/bridge-sandbox/        # Package bridge buildé localement (dev)
```

---

## Prérequis

- **Node.js** ≥ 18 (recommandé 20+)
- **npm** ou **pnpm/yarn**
- Un **workspace Angular** (Angular 20.x supporté ; `@angular/*` en *peer deps*)
- Accès à la **spec OpenAPI** de votre backend (URL ou fichier JSON)

---

## Documentation

- Index : `docs/index.md`
- Créer un bridge (workflow CI/CD) : `docs/creer-un-bridge.md`
- Consommer un bridge (côté app Angular) : `docs/consommer-un-bridge.md`
- Versioning & releases : `docs/versioning.md`
- Fonctionnalités HTTP : `docs/fonctionnalites/fonctionnalites-http.md`
- Fonctionnalités Mercure/SSE : `docs/fonctionnalites/fonctionnalites-mercure-sse.md`
- API publique du bridge : `docs/fonctionnalites/api-publique.md`
- Utilisation (CLI + workflows) : `docs/utilisation.md`
- FAQ : `docs/fonctionnalites/faq.md`
