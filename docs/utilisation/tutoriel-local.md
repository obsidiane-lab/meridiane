# Tutoriel local (hors pipeline)

Cette page fait partie des docs d’utilisation.

Ce tutoriel illustre un usage “dev local” dans le repo du package bridge.
L’objectif est de générer la lib, générer les modèles, puis builder la lib Angular.

Le point important en local est le confort : `meridiane init` aide à poser une base (config et snippets), mais reste optionnel.

## Mise en place

Dans la racine du workspace Angular (dossier avec `angular.json`) :

```bash
npm i -D @obsidiane/meridiane
npx meridiane init
```

Vous obtenez notamment :

- `models.config.js` (defaults de génération des models)
- `.env.example` (à copier en `.env` si vous voulez piloter via variables)

## Générer la lib bridge

```bash
npx meridiane lib backend-bridge @acme/backend-bridge 0.1.0
```

## Générer les modèles

```bash
npx meridiane models http://localhost:8000/api/docs.json --out=projects/backend-bridge/src/models --required-mode=spec
```

## Builder la lib

```bash
npx ng build backend-bridge
```

## Petit rappel

- `models.config.js` sert surtout à éviter de répéter des options pour `meridiane models`.
- `.env` est utile en local ; en CI on préfère des variables CI et/ou des arguments explicites.
