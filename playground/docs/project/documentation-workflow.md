# Workflow documentaire

## Quand mettre a jour `docs/project/`

Mettre a jour cette zone si l'on change :

- la stack ;
- l'architecture ;
- les conventions d'implementation ;
- une capacite structurante du template ;
- une decision de securite ;
- un contrat public ;
- une convention de delivery agentique.

## Comment

1. Mettre a jour la page la plus proche du changement.
2. Si la decision est structurante, reporter aussi dans `architecture-decisions.md`.
3. Si la carte du repo ou les variables changent, synchroniser `docs/project-map.md`
   ou `docs/root-env.md`.
4. Si le changement ne vaut que pour un detail backend, synchroniser aussi
   `core/docs/`.
5. Si le changement ne vaut que pour un detail frontend, synchroniser aussi
   `webfront/docs/`.
6. Relire `AGENTS.md` si la doctrine change.

## Ce qu'il faut eviter

- laisser une information durable uniquement dans le message final ;
- accumuler des TODO structurants non reportes ;
- conserver des references mortes ou contradictoires ;
- creer une decision d'architecture pour un micro-changement ;
- documenter chaque CRUD, page, champ ou bugfix standard.
