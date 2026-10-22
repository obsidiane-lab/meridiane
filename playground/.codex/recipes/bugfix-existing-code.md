# Recette - Bugfix ou intervention sur code existant

## Quand utiliser

Bug, regression, refactor local, alignement, amelioration ciblee ou comportement casse.

## Lire d'abord

1. `AGENTS.md`
2. `core/AGENTS.md` ou `webfront/AGENTS.md` selon le scope touche
3. les fichiers impliques et leur code d'appel
4. le code d'appel et le code appele
5. une seule carte `.codex/patterns/**` si une derive d'architecture est en cause

## Pattern a appliquer

- Comprendre le chemin d'execution reel avant edit.
- Reproduire ou expliquer pourquoi la reproduction est impossible.
- Corriger au plus petit endroit stable.
- Pour un bug UI, corriger l'usage ou la composition Spartan ; ne pas modifier manuellement `webfront/src/app/shared/ui/**`.
- Ne pas introduire de nouveau pattern sauf odeur de code nette.
- Verifier manuellement le scenario de regression si le bug est comportemental ; ne pas creer de test unitaire.

## Checks

Executer le check le plus proche de la zone modifiee : `make phpstan`, `make lint`, `make build` ou verification manuelle ciblee.

## Documentation durable seulement si

Le bug revele une convention manquante, une contradiction documentaire ou une regle reutilisable. Sinon : `Documentation durable : non necessaire`.
