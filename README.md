# Meridiane — générer un “bridge” Angular pour API Platform

> Ce paquet npm fournit :
> - un **CLI** pour générer une **lib Angular** (bridge) + des **models TypeScript** depuis OpenAPI ;
> - un **template** prêt à l’emploi (REST API Platform/Hydra + Mercure/SSE + facades).

---

## ✨ Ce que fait Meridiane

- Génère une **lib Angular** (bridge) à partir d’un template embarqué.
- Génère des **models TypeScript** depuis une **spec OpenAPI** (API Platform).
- Fournit des helpers runtime :
  - REST (API Platform / Hydra) ;
  - Mercure/SSE (mono-connexion, topics ref-count) ;
  - facades (signals) + interceptors (Content-Type, etc.).

---

## ⚡️ Démarrage rapide (app Angular / pipeline backend)

Dans une app Angular (ou dans la pipeline du backend) :

```bash
# 1) Installer le CLI
npm install -D @obsidiane/meridiane

# 2) Générer le bridge + models (dev)
# (installe le package localement dans node_modules)
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json --formats application/ld+json

# 3) Build CI/CD (génère + build + npm pack)
npx meridiane build @acme/backend-bridge --version 0.1.0 --spec https://staging.example/api/docs.json --formats application/ld+json
```

Le build produit `dist/<libName>` et un `.tgz` via `npm pack` (prêt à publier).

Astuce : si vous ne voulez générer que la lib (sans models), utilisez `--no-models` (et `--spec` devient inutile).

Formats :
- `--formats` est répétable (ou liste `,`) et l’ordre est significatif (format primaire en premier), ex: `--formats application/ld+json,application/json`.

---

## ✅ Ce qui est pris en compte (et ce qui ne l’est pas)

La génération de modèles est **contract-driven** : Meridiane ne génère que les modèles TypeScript **réellement utilisés par les endpoints** (`paths`) pour les formats sélectionnés via `--formats`.

Pris en compte :
- Parcours de `paths` (par format demandé) :
  - `responses` **2xx** et `default` pour les `content-type` correspondants (paramètres `; charset=...` ignorés)
  - `requestBody` pour les `content-type` correspondants (**sauf PATCH**)
- Fermeture transitive : suivi des `$ref` dans les JSON Schemas vers `#/components/schemas/*`.
- Multi-format : collisions désambiguïsées via un suffixe de format (ex: `*Json`, `*LdJson`).
- Mode JSON-LD (`application/ld+json`) :
  - modèles générés `extends Item`
  - les champs Hydra `@id/@type/@context` ne sont pas dupliqués (déjà dans `Item`)
- Stratégie de nullabilité (pilotée par `requiredMode`) :
  - `all` : tout optionnel + `| null`
  - `spec` : respecte `required` + `nullable`

Non pris en compte / pas encore supporté :
- Générer des modèles **non atteignables depuis `paths`** (i.e. `components.schemas` inutilisés).
- Générer des types TS standalone pour des schémas racines non-objet (ex: `enum`, `string`, `number`) si utilisés comme racine de request/response.
- Suivre des `$ref` vers d’autres emplacements que `#/components/schemas/*` (dans ce cas on retombe sur `any`).
- Générer des modèles pour les schémas `*.jsonMergePatch*` (les PATCH sont destinés à être typés en `Partial<>`).
- Sélection de modèle de `requestBody` pour les endpoints `PATCH` (merge-patch).

---

## 🎯 Contexte (à garder en tête)

Meridiane est optimisé pour ce workflow :

- 1 backend **Symfony / API Platform** → 1 package npm “bridge” (ex: `@acme/backend-bridge`) → n apps Angular.

Deux rôles :
- **Mainteneur** : génère/compile/publie le bridge.
- **Consommateur** : installe le package et configure `provideBridge()` dans l’app.

---

## 🧭 Ce repo (Meridiane)

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

## ✅ Prérequis

- **Node.js** ≥ 18 (recommandé 20+)
- **npm** ou **pnpm/yarn**
- Un **workspace Angular** (Angular 20.x supporté ; `@angular/*` en *peer deps*)
- Accès à la **spec OpenAPI** de votre backend (URL ou fichier JSON)

---

## 📚 Documentation

- Index : `docs/index.md`
- Créer un bridge (workflow CI/CD) : `docs/creer-un-bridge.md`
- Consommer un bridge (côté app Angular) : `docs/consommer-un-bridge.md`
- Versioning & releases : `docs/versioning.md`
- Fonctionnalités HTTP : `docs/fonctionnalites/fonctionnalites-http.md`
- Fonctionnalités Mercure/SSE : `docs/fonctionnalites/fonctionnalites-mercure-sse.md`
- API publique du bridge : `docs/fonctionnalites/api-publique.md`
- Utilisation (CLI + workflows) : `docs/utilisation.md`
- FAQ : `docs/fonctionnalites/faq.md`
