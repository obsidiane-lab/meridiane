# Tutoriel local (hors pipeline)

Cette page fait partie des docs d’utilisation.

Ce tutoriel illustre un usage “dev local” dans le repo du package bridge.
L’objectif est de générer la lib, générer les modèles, puis builder la lib Angular.

## Mise en place

Dans la racine du workspace Angular (dossier avec `angular.json`) :

```bash
npm i -D @obsidiane/meridiane
```

## Générer le bridge + models (dev)

```bash
npx meridiane dev @acme/backend-bridge --spec http://localhost:8000/api/docs.json --preset=native
```

## Builder la lib (local)

Deux options :

- via Meridiane (recommandé) :

```bash
npx meridiane build @acme/backend-bridge --version 0.1.0 --spec http://localhost:8000/api/docs.json --preset=native
```

- ou build Angular uniquement (si vous ne voulez pas packer) :

```bash
npx ng build backend-bridge
```
