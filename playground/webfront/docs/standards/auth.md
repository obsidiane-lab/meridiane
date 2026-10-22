# Accès au playground

Le playground est une application locale anonyme. Les pages de connexion et de déconnexion, les guards d'authentification, le bootstrap de session et les cookies d'autorisation Mercure de Foundation ont été retirés.

Le frontend charge sa configuration runtime, initialise ses traductions, puis affiche les pages de test. Il utilise le hub public de développement ; aucune configuration OIDC n'est requise.
