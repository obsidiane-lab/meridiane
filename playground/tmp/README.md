# TMP - memoire ephemere de travail

`tmp/` est reserve aux notes jetables de session. Codex ne doit pas le lire par defaut et ne doit jamais y laisser l'unique trace d'une decision durable.

## Ce qui peut vivre ici

- scratchpad de debug ;
- notes de discovery courtes ;
- liste temporaire de fichiers regardes ;
- hypothese provisoire pendant une tache longue.

## Ce qui ne doit pas etre cree par reflexe

- spec persistante ;
- feature brief ;
- status log ;
- runbook ;
- decision log.

Ces artefacts ne sont utiles que si l'utilisateur les demande explicitement ou si une tache longue en a besoin pour reduire le risque. Meme dans ce cas, ils restent temporaires.

## Regle Git

Le dossier est ignore par Git sauf :

- `tmp/README.md`
- `tmp/templates/*.md`
- `tmp/.gitkeep`

## Cloture

A la fin d'une tache, supprimer les notes inutiles. Si une convention, architecture, securite, contrat public ou connaissance metier reutilisable a change, mettre a jour `docs/project/` selon `docs/project/durable-memory-policy.md`.
