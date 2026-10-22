# Exemple - Entity ApiResource interne

```php
#[ORM\Entity]
#[ApiResource(
    operations: [new GetCollection(), new Get(), new Post(), new Patch(), new Delete()],
    security: "is_granted('ROLE_ADMIN')",
)]
class Resource
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    #[Assert\NotBlank]
    private string $name = '';
}
```

A imiter seulement pour un CRUD interne dont le contrat colle a l'entite.
