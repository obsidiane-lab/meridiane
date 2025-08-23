# Meridiane — Générateur de librairie Angular & *bridge* backend (avec modèles dynamiques)

> **TL;DR**  
> Ce repo fournit :
> 1) un **template de librairie Angular** prêt à l’emploi (bridge REST + SSE) ;
> 2) deux **scripts CLI** pour **générer une librairie** et **générer des modèles TypeScript** depuis une **spec OpenAPI**.

---

## ✨ Ce que fait le projet

- **Scaffold** une librairie Angular à partir d’un **template** (`projects/_lib_template`).
- Expose un **bridge** pour communiquer avec votre backend :
  - REST (adapter **API Platform / Hydra** prêt à l’emploi) ;
  - **SSE** via **Mercure** pour le temps réel — *mono-connexion EventSource* + **comptage de références par topic** (plusieurs façades peuvent s’abonner au même topic sans conflits) ;
  - **interceptors** (`Content-Type`, `X-Request-ID` de corrélation).
- **Génère des modèles TypeScript** à partir d’une **spec OpenAPI** (via Handlebars).
- Fournit une **facade** ergonomique (signals Angular) pour lister, lire, créer, mettre à jour, supprimer et **écouter** les entités en temps réel.

---

## 🧭 Structure (vue d’ensemble)

```
projects/
  _lib_template/                # Template de librairie
    src/
      lib/
        bridge/                 # REST + SSE (Mercure)
        facades/                # Facade + Factory (signals)
        interceptors/           # Content-Type + Correlation
        ports/                  # Contrats (Repository, Realtime)
        tokens.ts               # Injection tokens (API_BASE_URL, …)
      public-api.ts             # Ce que la lib exporte
    ng-package.json             # ng-packagr
    package.json                # placeholders
  tools/                        # Outils CLI
    generate-lib.js             # Génère une lib depuis le template
    generate-models.js          # Génère des modèles depuis OpenAPI
    generator/models/
      templates/                # Handlebars (model.hbs, index.hbs)
      openapi-to-models.js      # Transforme OpenAPI -> DTOs TS
      utils.js, handlebars.js   # Helpers
```

---

## ✅ Prérequis

- **Node.js** ≥ 18 (recommandé 20+)
- **npm** ou **pnpm/yarn**
- Un **workspace Angular** (Angular 20.x supporté ; `@angular/*` en *peer deps*)
- Accès à la **spec OpenAPI** de votre backend (URL ou fichier JSON/YAML converti en JSON)

---

## 🚀 1) Générer une librairie à partir du template

Exécutez depuis la racine du repo:

```bash
node projects/tools/generate-lib.js <lib-name> <npm-package-name> [version] <url-registry>
```

**Exemples**
```bash
node projects/tools/generate-lib.js backend-bridge @acme/backend-bridge 0.1.0 https://gitlab.com/api/v4/projects/12345678910/packages/npm/
```

**Placeholders remplacés**
- `__LIB_NAME__` → `<lib-name>`
- package.json, ng-package.json, chemins de sortie, etc.

---

## 🧬 2) Générer les modèles TypeScript depuis OpenAPI

Commande :

```bash
node projects/tools/generate-models.js <SPEC_OPENAPI_URL_OU_FICHIER_JSON> [--out=<dir>] [--no-index]
```

- `--out` : dossier de sortie **relatif au CWD** (défaut : `models`).
- `--no-index` : n’écrit pas `index.ts` d’export.

**Exemples (à lancer depuis le dossier de la lib générée)**

```bash
# 1) Depuis une URL (API Platform expose souvent /docs.json)
node projects/tools/generate-models.js http://localhost:8000/api/docs.json --out=projects/backend-bridge/src/models

# 2) Depuis un fichier local déjà en JSON
node projects/tools/generate-models.js ./openapi.json --out=projects/backend-bridge/src/models
```

> Les interfaces générées étendent `Item` et importent les types nécessaires.  
> Un `index.ts` est créé (sauf `--no-index`) pour centraliser les exports.

---

## 🏗️ 3) Builder (et publier) la librairie

```bash
# Build de la lib (ng-packagr)
ng build backend-bridge

# Le package est dans dist/<lib-name>
# Publication NPM (optionnel)
npm publish ./dist/backend-bridge
```

> Assurez-vous d’avoir les bons `name`, `version` et `peerDependencies` dans le `package.json` de la lib.

---

## 🧩 Utiliser la lib dans une app Angular

### Installation

```bash
npm i @acme/backend-bridge
```

### Configuration minimale (bridge)

Dans `main.ts` (ou `app.config.ts`), fournissez le bridge :

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';

import { provideBridge } from '<npm-package-name>';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideBridge({
      apiBaseUrl: 'http://localhost:8000',
      mercureHubUrl: 'http://localhost:8000/.well-known/mercure/',
      mercure: {
        headers: { Authorization: 'Bearer <token>' },
        // withCredentials: true,
      },
    }),
  ]
});
```

> `provideBridge()` configure `HttpClient` (fetch + interceptors),  
> et fournit **API_BASE_URL**, **MERCURE_CONFIG** et **MERCURE_HUB_URL**.

### Exemple d’utilisation avec FacadeFactory

```ts
import {Component, computed, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import type {Conversation} from '../../entities/conversation';
import {FacadeFactory} from "@acme/bridge";
import {ResourceFacade} from "@acme/bridge";

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversations.component.html',
  styleUrls: ['./conversations.component.css'],
})
export class ConversationsLabComponent {
  readonly facade: ResourceFacade<Conversation>;

  // Signals façade
  readonly conversations
  readonly loading
  readonly status

  // Sélection & formulaire
  readonly selectedId = signal<string | null>(null);
  formExternalId = '';

  // Conversation sélectionnée
  readonly selected = computed<Conversation | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.conversations().find(c => c.id === id) ?? null;
  });

  constructor(protected facadeFactory: FacadeFactory) {

    this.facade = facadeFactory.create<Conversation>({url: `/api/conversations`})

    this.conversations = this.facade.items;
    this.loading = this.facade.loading;
    this.status = this.facade.connectionStatus;
  }

  loadList() {
    this.facade.list({page: 1, itemsPerPage: 20});
  }

  watchAll() {
    this.facade.watchAll();
  }

  unwatchAll() {
    this.facade.unwatchAll();
  }

  watchOne() {
    const id = this.selectedId();
    if (id) this.facade.watchOne(id);
  }

  unwatchOne() {
    const id = this.selectedId();
    if (id) this.facade.unwatchOne(id);
  }

  manualGet() {
    const id = this.selectedId();
    if (!id) return;
    this.facade.get(id).subscribe(res => {
      console.log("get entity", res)
    });
  }

  patchExternalId() {
    const id = this.selectedId();
    if (!id) return;
    const ext = this.formExternalId?.trim();
    this.facade.update({id, changes: {externalId: ext}}).subscribe(res => {
      console.log("patched", res)
    });
  }


  select(c: Conversation) {
    this.selectedId.set(c.id);
    this.formExternalId = c.externalId ?? '';
  }
}

```

**FacadeFactory factory fourni un object `ResourceFacade<T>`**

- `items: Signal<readonly T[]>` — liste courante
- `loading: Signal<boolean>` — état de chargement
- `list(query?: Query)` — charge une page (`page`, `itemsPerPage`, `order`, `filters`)
- `get(id: Id)` — récupère un item
- `create(cmd: { payload: T })`
- `update(cmd: { id: Id; changes: Partial<T> })`
- `delete(id: Id)`
- `watchAll()` / `unwatchAll()` — (SSE) abonne/désabonne toutes les entités chargées
- `watchOne(id: Id)` / `unwatchOne(id: Id)` — (SSE) sur une entité précise

**Note (SSE & topics)**  
  Le bridge maintient un **compteur par topic** (`@id`).  
   Chaque `watch*` **incrémente** ce compteur ; chaque `unwatch*` **décrémente**.  
  Le **désabonnement effectif** d’un topic n’a lieu **que lorsque le compteur retombe à 0**.  
  👉 Plusieurs façades peuvent donc observer **la même ressource** sans se gêner :
```ts
facadeA.watchOne('/api/conversations/1');
facadeB.watchOne('/api/conversations/1');
facadeA.unwatchOne('/api/conversations/1'); // toujours abonné (compteur > 0)
facadeB.unwatchOne('/api/conversations/1'); // désabonnement effectif (compteur = 0)
```
### Paramétrage des interceptors HTTP

- **`content-type.interceptor`** :
  - `Accept: application/ld+json`
  - `Content-Type` :
    - `POST` / `PUT` → `application/ld+json`
    - `PATCH` → `application/merge-patch+json`

Vous pouvez injecter vos propres interceptors via `extraInterceptors` dans `provideBridge()`.
---

## 🛠️ Personnalisation

- **Modèles** : adaptez les templates Handlebars (`projects/tools/generator/models/templates/`) selon votre style/linters.
- **Auth** : passez un provider `auth` et/ou des `extraInterceptors` dans `provideBridge()` (Bearer, CSRF, etc.).
- **SSE** : fournissez `mercureHubUrl` et `mercure` (headers/cookies).

---

Bon dev ! 🚀
