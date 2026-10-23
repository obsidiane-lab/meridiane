---
name: obsidiane-api-contract
description: "Contrat API Foundation: OpenAPI, bridge Meridiane, typing genere, champ ou operation exposee."
---

# Contrat API et bridge

1. Lire `AGENTS.md`.
2. Lire `.codex/recipes/bridge-contract.md`.
3. Lire `.codex/patterns/bridge/contract-generation.md`.
4. Lire `core/AGENTS.md` si le contrat backend change.
5. Lire `webfront/AGENTS.md` si l'usage frontend change.
6. Corriger la source du contrat cote backend.
7. Verifier l'OpenAPI generee si possible.
8. Lancer `make bridge`.
9. Adapter repository, service et composant sans modifier `webfront/bridge/` a la main.
10. Executer `make build`, puis `make phpstan` si backend modifie.
11. Documenter durablement seulement si la strategie de generation, un contrat public structurant ou une regle de mapping change.
