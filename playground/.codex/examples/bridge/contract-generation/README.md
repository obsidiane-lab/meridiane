# Exemple - Contrat backend vers bridge

```bash
make bridge
make build
```

Ajouter `make lint` seulement si l'adaptation frontend touche des regles lint ou architecture. Si le bridge genere un type inattendu, corriger l'`ApiResource`, le DTO, les operations ou la serialization cote backend. Ne jamais patcher `webfront/bridge/`.
