# Pattern - Ownable Doctrine

## Utilise quand

Ressource Doctrine privee par utilisateur : collections et items doivent etre invisibles pour tout utilisateur qui n'en est pas proprietaire.

## Principe

Ownable est d'abord un filtre de lecture Doctrine. La protection principale contre les fuites de donnees est appliquee dans le `QueryBuilder` par `OwnableExtension`, pas dans le frontend et pas via un filtre client.

- Collection : ne retourne que les items du proprietaire courant.
- Item : un IRI devine vers l'item d'un autre utilisateur ne doit pas charger la donnee.
- Utilisateur non authentifie : zero resultat.
- Ecriture : `OwnedProcessor` assigne l'owner et bloque reassociation/delete non autorises.

## Philosophie de choix

Ownable est le cas utilisateur d'un principe plus general : quand une donnee ne doit pas etre visible hors d'un perimetre, appliquer ce perimetre structurellement au niveau lecture. Le probleme principal est alors l'invisibilite de la ressource, pas seulement l'autorisation d'une action.

Choisir Ownable quand ce perimetre est le proprietaire utilisateur. Pour un tenant, une organisation, un workspace, une equipe ou une partition metier, appliquer une approche equivalente adaptee au perimetre plutot que de s'appuyer sur le frontend ou sur un filtre client.

Choisir plutot un Voter, une ACL ou une strategie tenant quand la ressource est partagee, collaborative ou visible par plusieurs acteurs avec des permissions differentes. Un Voter decide une action sur un sujet ; Ownable retire le sujet du resultat avant exposition.

Ownable et Voter peuvent se completer : Ownable filtre les lectures privees, un Voter ajoute une regle metier fine sur une operation precise.

## A appliquer

- Entite Doctrine : implementer `OwnableInterface` et utiliser `OwnableTrait`.
- Operations d'ecriture : utiliser `OwnedProcessor` sur `Post`, `Patch`, `Delete`.
- Lectures : garder le provider Doctrine natif quand possible pour beneficier de `OwnableExtension`.
- Provider custom / DTO : appliquer explicitement le scope owner avant de retourner les donnees, car `OwnableExtension` ne s'applique pas.

## Squelette

```php
#[ApiResource(
    operations: [
        new Get(),
        new GetCollection(),
        new Post(processor: OwnedProcessor::class),
        new Patch(processor: OwnedProcessor::class),
        new Delete(processor: OwnedProcessor::class),
    ],
)]
class PrivateResource implements OwnableInterface
{
    use OwnableTrait;
}
```

## Anti-patterns

Filtre `ownerId` fourni par le client, condition d'ownership uniquement dans le frontend, provider custom qui oublie le scope owner, Voter utilise pour compenser une collection non filtree, bypass admin implicite, ressource partagee forcee dans Ownable alors qu'elle demande un Voter, une ACL ou une strategie tenant.
