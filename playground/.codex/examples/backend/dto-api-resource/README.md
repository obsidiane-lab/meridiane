# Exemple - DTO ApiResource public

```php
#[ApiResource(
    shortName: 'Resource',
    operations: [
        new GetCollection(provider: ResourceProvider::class),
        new Post(input: ResourceCreateInput::class, processor: ResourceProcessor::class),
    ],
)]
final class ResourceOutput
{
    public string $id;
    public string $name;
    public string $status;
}
```

Le DTO est le contrat public. Le provider/processor mappe vers le modele Doctrine sans exposer les details internes.
