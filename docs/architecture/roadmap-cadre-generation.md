# Roadmap — Cadre de génération multi-target (plan d’implémentation)

Objectif : refondre Meridiane pour supporter plusieurs targets (Angular, Symfony/PHP aujourd’hui) avec un moteur commun, une IR unique et des règles strictes de génération.

Ce document ne contient pas d’hypothèses fonctionnelles non validées. Les points bloquants sont listés explicitement.

---

## Checklist opérationnelle (exécution pas à pas)

Cette checklist est l’ordre d’exécution recommandé. Chaque étape est **atomique** et testable.

### A — Préparation (cartographie)
**A1. Inventaire des modules existants**
- [ ] Lister les fichiers qui lisent la spec OpenAPI.
- [ ] Lister les modules “génération modèles TS”.
- [ ] Lister les modules “runtime Angular” (BridgeFacade, ResourceRepository, SSE).
- [ ] Lister les modules “build/dev” (ng-packagr, npm pack).
- [ ] Sortir un plan de déplacement (engine vs target).

**A2. Geler le comportement Angular**
- [ ] Choisir une spec OpenAPI de référence (local JSON).
- [ ] Générer un bridge Angular avec les options usuelles.
- [ ] Archiver la sortie de référence (baseline pour diff).

### B — Structure du code (squelette)
**B1. Créer la structure “engine / targets / templates”**
- [ ] Créer `tools/engine/`.
- [ ] Créer `tools/targets/angular/`.
- [ ] Créer `tools/targets/symfony/`.
- [ ] Créer `templates/angular/` (copie du template actuel).
- [ ] Créer `templates/symfony/` (vide pour l’instant).

**B2. Définir l’interface Target**
- [ ] Créer `tools/targets/target.interface.js` (ou équivalent).
- [ ] Inclure : `id`, `capabilities`, `normalize(config)`, `run(ctx)`.
- [ ] Définir `NotSupportedError`, `UnsupportedOptionError`.

**B3. Créer le registry**
- [ ] Créer `tools/targets/registry.js` (map id -> target).
- [ ] Préparer `angular` et `symfony` (stub).

### C — Engine (orchestration + IR)
**C1. Centraliser parsing CLI**
- [ ] Ajouter `--target` à toutes les commandes.
- [ ] Créer un `normalizeCommonOptions` unique (mêmes options pour tous).
- [ ] Supprimer la logique target-specific du parsing CLI.

**C2. Orchestrateur unique**
- [ ] Créer `tools/engine/run.js` (orchestration).
- [ ] Déplacer la logique de logging commune (title/info/step).
- [ ] Déléguer au target via `registry.resolve`.

**C3. Lecture OpenAPI unique**
- [ ] Déplacer `readOpenApiSpec` dans `tools/engine/`.
- [ ] Centraliser `--no-models` (skip spec).
- [ ] Interdire la lecture directe de spec dans les targets.

**C4. Construire l’IR**
- [ ] Extraire la logique “models” existante vers `tools/engine/openapi/`.
- [ ] Construire `ModelsIR` avec types neutres.
- [ ] Construire `EndpointsIR` flat (path + method).
- [ ] Définir `BridgeIR` avec `irVersion`.

**C5. Injection IR → target**
- [ ] Passer `ir` aux targets via `EngineContext`.
- [ ] Gérer le cas `noModels` (IR partielle / sans `models`).

### D — Target Angular (adaptation)
**D1. Déplacer la génération Angular**
- [ ] Déplacer `infra/generate/bridge.js` vers `targets/angular/generate.js`.
- [ ] Adapter au nouveau `BridgeIR` (pas d’OpenAPI direct).

**D2. Adapter `build` Angular**
- [ ] Déplacer `bridge-workflow.js` vers `targets/angular/build.js`.
- [ ] S’assurer que le target appelle `standalone-workspace`.

**D3. Adapter `dev` Angular**
- [ ] Déplacer `run-dev` dans `targets/angular/dev.js`.
- [ ] Garder la logique “install local tgz”.

**D4. Non-régression Angular**
- [ ] Regénérer avec la spec de référence.
- [ ] Diff outputs vs baseline.
- [ ] Corriger toute différence non justifiée.

### E — Target Symfony/PHP (création)
**E1. Définir les règles PHP**
- [ ] Déterminer format `packageName` (ex. `vendor/name`).
- [ ] Déterminer dérivation namespace + nom de bundle.
- [ ] Déterminer format artefact `build`.

**E2. Templates bundle Symfony**
- [ ] Créer `templates/symfony` (composer.json, src/Bundle, Extension, services).
- [ ] Prévoir un `BridgeFacade` et `ResourceRepository` en runtime.

**E3. Runtime PHP**
- [ ] Implémenter `BridgeFacade` (REST base).
- [ ] Implémenter `ResourceRepository`.
- [ ] Implémenter `HttpCallOptions` (headers, credentials).

**E4. DTO PHP**
- [ ] Écrire l’émetteur `ModelsIR -> DTO`.
- [ ] Respect des noms et nullabilités.

**E5. Build Symfony**
- [ ] Implémenter `build` selon la décision (archive ou dossier).
- [ ] Émettre une erreur explicite si non supporté.

**E6. Validation Symfony**
- [ ] Vérifier bundle chargeable (DI).
- [ ] Vérifier appels REST de base.

### F — Documentation + migration
**F1. Mettre à jour la doc CLI**
- [ ] Ajouter `--target`.
- [ ] Ajouter exemples Symfony.

**F2. Mettre à jour doc architecture**
- [ ] Vérifier `cadre-generation.md`.
- [ ] Ajouter règles PHP si besoin.

**F3. Notes de migration**
- [ ] Expliquer les impacts du changement de structure.

---

## Phase 0 — Cadrage et décisions bloquantes

### 0.1 Valider le contrat d’IR
**Livrables**
- Validation officielle du schéma IR (modèles + endpoints flat + types neutres).
- Validation de l’`irVersion` initiale (v1).

**Critères d’acceptation**
- L’IR couvre toutes les règles de génération déjà existantes côté Angular (noms, filtres, formats, etc.).
- L’IR est suffisante pour générer Angular + Symfony/PHP sans parsing OpenAPI côté target.

### 0.2 Décisions packaging Symfony/PHP
**Questions**
- Quel artefact exact pour `build` (dossier prêt, archive Composer, autre) ?
- Quel format de `packageName` attendu côté PHP (ex. `vendor/name`) ?

**Livrables**
- Décision documentée.

### 0.3 Namespace + nom du bundle Symfony
**Questions**
- Comment dériver le namespace et le nom du bundle à partir de `<packageName>` ?

**Livrables**
- Règles de dérivation validées et documentées.

### 0.4 Contrat `HttpCallOptions` universel
**Questions**
- Quelles options sont garanties “cross-target” (headers, credentials, timeout, retries) ?

**Livrables**
- Liste validée, publiée dans la doc (contrat runtime).

---

## Phase 1 — Refactor Engine / Targets (structure du projet)

### 1.0 Inventaire du code actuel (pré-rework)
**Travail**
- Cartographier les modules actuels : `run-*.js`, `bridge-workflow.js`, `infra/generate/bridge.js`, `generator/models/*`.
- Lister ce qui est strictement “OpenAPI → models” vs “Angular runtime”.
- Identifier les dépendances implicites (ex. Angular-specific dans les modèles).

**Livrables**
- Liste des modules à déplacer (engine vs target).
- Liste des fonctions “communes” à isoler.

### 1.1 Définir la structure des dossiers
**Travail**
- Créer les dossiers cibles (noms définitifs à valider) :
  - `tools/engine/` (orchestration + IR)
  - `tools/targets/` (`angular/`, `symfony/`)
  - `tools/generator/` (ou `tools/openapi/` pour la logique partagée)
  - `templates/angular/`, `templates/symfony/`

**Livrables**
- Arborescence minimale créée.

### 1.2 Introduire la factory de targets
**Travail**
- Créer `targets/registry` qui mappe `targetId -> target`.
- Définir un contrat d’interface stable (capabilities, normalize, run).

**Livrables**
- Registry + interface documentée.

### 1.3 Déplacer l’ancien générateur Angular
**Travail**
- Isoler la génération Angular existante dans `targets/angular/`.
- Garantir un comportement identique (pas de régressions).

**Livrables**
- Génération Angular fonctionnelle via l’engine.

---

## Phase 2 — Engine (IR + orchestration)

### 2.1 Orchestrateur unique (CLI → Engine)
**Travail**
- Centraliser la lecture des options CLI et produire un `CommonConfig`.
- Résoudre le target via la factory.
- Déléguer le mode (`generate|build|dev`) au target.

**Livrables**
- `run-generate`, `run-build`, `run-dev` réduits à un appel engine.

### 2.2 Lecture OpenAPI unique
**Travail**
- Déplacer la logique `readOpenApiSpec` dans l’engine.
- Gérer `--no-models` de manière globale.

**Livrables**
- Aucun target ne lit la spec directement.

### 2.3 Construction de l’IR (models + endpoints)
**Travail**
- Reprendre la logique existante de modèles (noms, formats, include/exclude).
- Construire l’IR “flat endpoints”.
- Versionner l’IR (`irVersion: 1`).

**Livrables**
- `BridgeIR` stable, partagé aux targets.

### 2.4 Adaptation des options CLI (target-agnostic)
**Travail**
- Ajouter `--target` à toutes les commandes.
- Unifier le parsing des options (mêmes flags pour tous).
- Conserver les options existantes (compatibilité).

**Livrables**
- CLI unique qui route vers le target sans logique conditionnelle côté CLI.

---

## Phase 3 — Runtime contract commun

### 3.1 Formaliser le contrat runtime
**Travail**
- Stabiliser les noms publics : `BridgeFacade`, `ResourceRepository`.
- Définir l’API minimale (`get`, `getCollection`, `post`, `put`, `patch`, `delete`, `request`).

**Livrables**
- Documentation mise à jour.

### 3.2 Définir `HttpCallOptions` universel
**Travail**
- Fixer la liste des options cross-target (au minimum `headers`, `credentials`).

**Livrables**
- Contrat intégré dans la doc et l’IR si nécessaire.

---

## Phase 4 — Target Angular (adaptation à l’engine)

### 4.1 Adapter la génération Angular à l’IR
**Travail**
- Remplacer l’usage direct d’OpenAPI par l’IR.
- S’assurer que la génération des modèles reste identique.

**Livrables**
- Sorties Angular identiques aux sorties actuelles.

### 4.2 Adapter `build` et `dev`
**Travail**
- `build` : conserver `standalone-workspace` mais déclenché par le target.
- `dev` : conserver la logique d’installation locale, déclenchée par le target.

**Livrables**
- Commandes `build` et `dev` fonctionnelles via engine.

### 4.3 Tests de non-régression Angular (obligatoire)
**Travail**
- Comparer un output avant/après refonte (même spec, mêmes options).
- Vérifier l’identité des modèles générés.

**Livrables**
- Validation explicite “pas de régressions”.

---

## Phase 5 — Target Symfony/PHP (nouveau)

### 5.1 Templates bundle Symfony
**Travail**
- Créer la structure de bundle (namespace, extension, services).
- Exposer les services runtime + DTO.

**Livrables**
- Template bundle stable.

### 5.2 Runtime PHP (bridge REST)
**Travail**
- Implémenter `BridgeFacade` et `ResourceRepository`.
- Implémenter les méthodes REST de base.
- Encapsuler la config (headers, base URL, auth/cookies).

**Livrables**
- Runtime PHP exploitable (sans SSE).

### 5.3 Génération des DTO PHP
**Travail**
- Traduire `ModelsIR` en DTO typés.
- Respect strict des noms, propriétés, nullabilité.

**Livrables**
- DTO PHP identiques conceptuellement aux modèles TS.

### 5.4 `build` Symfony/PHP
**Travail**
- Implémenter la génération de l’artefact défini en phase 0.2.

**Livrables**
- `build` opérationnel (ou erreur explicite si non supporté).

### 5.5 Vérifications Symfony/PHP minimales
**Travail**
- Vérifier que le bundle se charge (DI).
- Vérifier que le runtime est instanciable et appelable.

**Livrables**
- Checklist validée.

---

## Phase 6 — Documentation + migration

### 6.1 Documentation CLI
**Travail**
- Ajouter `--target` et les règles globales.
- Ajouter les exemples `symfony`/`php`.

**Livrables**
- `docs/cli.md` à jour.

### 6.2 Documentation architecture
**Travail**
- Mettre à jour/valider `docs/architecture/cadre-generation.md`.

**Livrables**
- Doc de référence stable.

### 6.3 Notes de migration
**Travail**
- Documenter l’impact sur l’existant (CLI + structure de sortie).

**Livrables**
- Guide de migration succinct.

---

## Dépendances critiques

- Phase 0 (décisions) bloque la Phase 5 (Symfony/PHP).
- Phase 2 (IR) bloque l’adaptation Angular (Phase 4) et la création Symfony (Phase 5).
- Phase 3 (runtime contract) bloque les deux targets.

---

## Points ouverts (à résoudre avant implémentation finale)

1. Artefact exact attendu pour `build` Symfony/PHP.
2. Format exact de `packageName` PHP et dérivation namespace/bundle.
3. Liste finale des options `HttpCallOptions` universelles.
4. Stratégies d’auth à standardiser (cookie/bearer/custom headers).

---

## Notes d’exécution (logique interne)

### Découpage technique suggéré (sans imposer de solution)
- L’IR et la logique OpenAPI doivent être dans un module “sans dépendance target”.
- Le target Angular conserve l’intégralité de la logique Angular, mais **injectée** par l’engine.
- Le target Symfony/PHP implémente son runtime et son bundle sans SSE.

### Ordre d’exécution recommandé
1. Phase 1 (structure) → sans changement fonctionnel.
2. Phase 2 (engine + IR) → tests non-régression Angular.
3. Phase 3 (contrat runtime) → stabiliser l’API publique.
4. Phase 5 (Symfony/PHP) → implémentation target.
5. Phase 6 (docs) → finaliser.
