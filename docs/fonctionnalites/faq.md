# FAQ / limites

Cette page fait partie des docs d’utilisation.

## Pourquoi un package “bridge” par backend ?

Cela évite de mélanger plusieurs contrats API dans un même package.
Chaque backend garde sa spec, ses models, ses conventions, et ses releases.

## Est-ce que Mercure est obligatoire ?

Non. Sans `hubUrl`, le realtime est simplement désactivé.
Le bridge reste utilisable pour HTTP.

## Pourquoi `ng-packagr` est nécessaire ?

Le bridge généré est une **lib Angular** construite avec `ng build <lib-name>`, qui s’appuie sur `ng-packagr`.
Dans un workspace “app-only”, il faut généralement l’ajouter en devDependency.

## Comment activer les logs ?

Le CLI : `meridiane --debug ...`.  
Le runtime Angular : `provideBridge({ debug: true })`.

## Le bridge supporte-t-il SSR ?

Le code SSE est protégé par un check navigateur (pas d’EventSource côté serveur).
Cela dit, le support SSR dépend aussi de votre app et de votre stratégie de data fetching.
