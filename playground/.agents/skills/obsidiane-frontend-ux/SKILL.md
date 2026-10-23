---
name: obsidiane-frontend-ux
description: "UI Angular Foundation: page, route, formulaire, table, i18n, signal, store, repository ou service."
---

# Frontend UX Angular

1. Lire `AGENTS.md` et `webfront/AGENTS.md`.
2. Lire `.codex/recipes/frontend-page.md`.
3. Si une surface visible est touchee, lire `.agents/skills/spartan/SKILL.md`, puis uniquement la
   regle Spartan utile.
4. Identifier l'intention : page, formulaire, liste, detail par IRI, action, route, menu, i18n,
   composition partagee ou logique frontend.
5. Lire seulement les pattern cards utiles : store/repository/service/component, entity resource
   signal, table, ou reactive form uniquement si cette strategie de formulaire est retenue.
6. Utiliser `ng generate` ou `npm run ng -- generate` pour les squelettes applicatifs couverts par
   Angular.
7. Garder HTTP dans repository, vocabulaire feature dans service et presentation dans composant.
8. Respecter `store -> repository -> service -> composant` et ne pas dupliquer un modele bridge.
9. Ne jamais modifier `webfront/bridge/` a la main ; basculer vers `obsidiane-api-contract` si le
   contrat genere est en cause.
10. Pour toute UI, appliquer sans variante locale les invariants de `webfront/AGENTS.md` et le
    workflow du skill `spartan`.
11. Executer `make lint && make build` ; ne pas creer ni generer de tests unitaires.
