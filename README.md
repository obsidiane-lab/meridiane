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
      openapi-to-models.js      # Orchestrateur OpenAPI -> modèles TS
      type-resolver.js          # Résolution des types (enum, unions, null, arrays, objets)
      schema-utils.js           # Merge allOf, filtrage , helpers Hydra
      naming.js                 # Friendly name des schémas (groupes jsonld/jsonapi)
      utils.js, handlebars.js   # Helpers (fs, identifiants TS, render)
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
node projects/tools/generate-models.js <SPEC_OPENAPI_URL_OU_FICHIER_JSON> [--out=<dir>] [--item-import=../lib/ports/resource-repository.port] [--required-mode=all-optional|spec] [--no-index]
```

- `--out` : dossier de sortie **relatif au CWD** (défaut : `models`).
- `--item-import` : chemin d’import de l’interface `Item` utilisé par les modèles (défaut : `../lib/ports/resource-repository.port`).
- `--required-mode` : contrôle les `?` des propriétés. `all-optional` (défaut) marque toutes les propriétés optionnelles; `spec` respecte le tableau `required` de la spec.
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

Règles de nommage
- Variantes `.jsonld`/`.jsonapi` sont dé-dupliquées (préférence `jsonld`).
- Si un schéma groupé a un nom de base unique et non en conflit avec une racine, on conserve le nom de base (ex. `RegisterIdentityInput.jsonld-user.register` → `RegisterIdentityInput`).
- Sinon, on garde un nom enrichi lisible (ex. `Identity.jsonld-user.read` → `IdentityUserRead`).

Configuration via fichier `models.config.js`
- Placez un fichier `models.config.js` à la racine du repo (voir `models.config.example.js`).
- Propriétés supportées:
  - `outDir` (string) — dossier de sortie par défaut.
  - `itemImportPath` (string) — import `Item` dans les templates.
  - `requiredMode` ('all-optional' | 'spec') — optionnalité des propriétés.
  - `preferFlavor` ('jsonld' | 'jsonapi' | 'none') — préférence de variante.
  - `hydraBaseRegex` (RegExp|string) — regex des schémas Hydra à ignorer.
- Priorité: paramètres CLI > `models.config.js` > valeurs par défaut.

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
  imports: [CommonModule, FormsModule],
  templateUrl: './conversations.component.html',
  styleUrls: ['./conversations.component.css'],
})
export class ConversationsLabComponent {
  readonly facade: ResourceFacade<Conversation>;

  // Signals façade
  readonly conversations
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
    this.status = this.facade.connectionStatus;
  }

  select(c: Conversation) {
    this.selectedId.set(c.id);
    this.formExternalId = c.externalId ?? '';
  }
  
  load() {
    this.facade.list$({page: 1, itemsPerPage: 20}).subscribe();
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
    this.facade.get$(id).subscribe(res => {
      console.log("get entity", res)
    });
  }

  patchExternalId() {
    const id = this.selectedId();
    if (!id) return;
    const ext = this.formExternalId?.trim();
    this.facade.update$({id, changes: {externalId: ext}}).subscribe(res => {
      console.log("patched", res)
    });
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


### 🔔 Temps réel (SSE/Mercure) — écouter des **sous-ressources** par **relation**

Vous pouvez vous abonner à un **topic parent** (ex. une *Conversation*) et ne recevoir que les événements dont une **relation** (ex. `conversation`) pointe vers ce topic.
Aucune 2ᵉ connexion SSE n’est ouverte : le filtrage est fait côté client.

#### RealtimePort — `subscribe$` (filtre par relation)

```ts
// Reçoit les Message dont message.conversation == '/api/conversations/1'
this.conversationFacade
  .watchSubResource$<Message>({ url: '/api/conversations/1', field: 'conversation' })
  .subscribe(msg => {
    console.log('nouveau Message:', msg);
  });
```

**Variantes**

```ts
// Plusieurs conversations ouvertes
this.conversationFacade.watchSubResource$<Message>({
  url: ['/api/conversations/1', '/api/conversations/2'],
  field: 'conversation'
}).subscribe();

// Relation imbriquée ou tableau
// field: 'conversation.@id'        // si la relation est un objet { '@id': ... } // TODO
// field: 'conversations'           // si la relation est un tableau d'IRIs/objets
```

### Côté API Platform

Publiez la sous-ressource **sur le topic parent** **et** sur son propre topic, et exposez la relation dans le payload :

```php
mercure: {
  topics: [
    '@=iri(object)',                      // /api/conversations/{id}/messages/{mid}
    '@=iri(object.getConversation())'     // /api/conversations/{id}
  ]
}
```

Le payload Mercure doit contenir la relation :

```json
{
  "@type": "Message",
  "@id": "/api/conversations/1/messages/72",
  "conversation": "/api/conversations/1",
  "originalText": "Bien l",
  "createdAt": "2025-08-24T10:01:13+00:00",
  "senderId": "user-123"
}
```


## Paramétrage des interceptors HTTP

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
