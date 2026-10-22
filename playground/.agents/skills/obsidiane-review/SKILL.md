---
name: obsidiane-review
description: "Review Foundation: diff ou PR, bugs, regressions, securite, contrat API, architecture et checks."
---

# Review Foundation

Utiliser quand l'utilisateur demande une review, une relecture de diff, une verification de PR ou
une analyse de risques avant merge.

Lire `AGENTS.md`, la recette correspondant au diff, puis uniquement les fichiers modifies et les
appels entrants/sortants necessaires. Si le diff touche une UI, lire `webfront/AGENTS.md` et
`.agents/skills/spartan/SKILL.md`.

Commencer par les findings classes par severite, avec fichier et ligne. Chercher bugs, regressions,
fuite de donnees, contrat API casse, violation `store -> repository -> service -> composant`, bridge
modifie a la main et checks manquants.

Pour un diff frontend, signaler chaque ecart aux invariants UI de `webfront/AGENTS.md` et aux regles
du skill `spartan`, notamment toute ecriture dans la zone generee sans provenance CLI explicite. Ne
pas maintenir une checklist Spartan parallele dans ce skill.

Ne pas commenter le style subjectif sauf s'il produit un risque de maintenance, accessibilite,
lisibilite ou incoherence avec les patterns Foundation.

Si aucun probleme n'est trouve, le dire clairement et mentionner les risques residuels ou checks non
executes. Finir par les questions ouvertes puis un resume court seulement apres les findings.
