# Meridiane — générer un “bridge” Angular pour API Platform

> Ce paquet npm fournit :
> - un **CLI** pour générer une **lib Angular** (bridge) + des **models TypeScript** depuis OpenAPI ;
> - un **template** prêt à l’emploi (REST API Platform/Hydra + Mercure/SSE + facades).

---

## ✨ Ce que fait Meridiane

- Génère une **lib Angular** (dans `projects/<lib-name>`) à partir d’un template embarqué.
- Génère des **models TypeScript** depuis une **spec OpenAPI** (API Platform).
- Fournit des helpers runtime :
  - REST (API Platform / Hydra) ;
  - Mercure/SSE (mono-connexion, topics ref-count) ;
  - facades (signals) + interceptors (Content-Type, etc.).

---

## ⚡️ Démarrage rapide (repo du bridge)

Dans le repo qui va publier votre bridge (workspace Angular avec `angular.json`) :

```bash
# 1) Installer le CLI
npm install -D @obsidiane/meridiane

# 2) (Recommandé) Générer la config + snippets
npx meridiane init

# 3) Générer la lib bridge (une fois)
npx meridiane lib backend-bridge @acme/backend-bridge 0.1.0

# 4) Générer les models (à relancer quand le backend change)
npx meridiane models http://localhost:8000/api/docs.json --out=projects/backend-bridge/src/models

# (Optionnel) Dev: lib + models en une commande (localhost par défaut)
npx meridiane dev-bridge backend-bridge @acme/backend-bridge 0.1.0

# 5) Builder la lib
npx ng build backend-bridge
```

La lib générée peut ensuite être publiée (`dist/backend-bridge`) et consommée dans vos apps Angular via `npm i @acme/backend-bridge`.

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
    tools/                      # Générateurs (lib + models)
    templates/_lib_template/     # Template de librairie Angular (bridge)
apps/
  sandbox/                      # App Angular de dev (non publiée)
    projects/sandbox/           # L'app
    projects/bridge-sandbox/    # Lib générée (ignorée, régénérée à la demande)
```

---

## ✅ Prérequis

- **Node.js** ≥ 18 (recommandé 20+)
- **npm** ou **pnpm/yarn**
- Un **workspace Angular** (Angular 20.x supporté ; `@angular/*` en *peer deps*)
- Accès à la **spec OpenAPI** de votre backend (URL ou fichier JSON/YAML converti en JSON)

---

## 📚 Documentation

- Index : `docs/index.md`
- Créer un bridge : `docs/creer-un-bridge.md`
- Fonctionnalités HTTP : `docs/fonctionnalites/fonctionnalites-http.md`
- Fonctionnalités Mercure/SSE : `docs/fonctionnalites/fonctionnalites-mercure-sse.md`
- API publique du bridge : `docs/fonctionnalites/api-publique.md`
- CLI Meridiane : `docs/utilisation/cli.md`
- Configuration : `docs/utilisation/configuration.md`
- Tutoriel CI/CD : `docs/utilisation/tutoriel-ci-cd.md`
- Tutoriel local : `docs/utilisation/tutoriel-local.md`
- FAQ : `docs/fonctionnalites/faq.md`
