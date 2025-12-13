<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\EventLogRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: EventLogRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(security: "is_granted('ROLE_USER')"),
        new Put(security: "is_granted('ROLE_USER')"),
        new Patch(security: "is_granted('ROLE_USER')"),
        new Delete(security: "is_granted('ROLE_USER')"),
    ],
    mercure: true,
)]
class EventLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['event.read'])]
    private ?int $id = null;

    #[ORM\Column(length: 120)]
    #[Assert\NotBlank]
    #[Groups(['event.read', 'event.write'])]
    private string $name = '';

    #[ORM\Column(type: 'json')]
    #[Groups(['event.read', 'event.write'])]
    #[ApiProperty(openapiContext: [
        'oneOf' => [
            [
                'type' => 'object',
                'required' => ['kind', 'email', 'subject'],
                'properties' => [
                    'kind' => ['type' => 'string', 'enum' => ['email']],
                    'email' => ['type' => 'string', 'format' => 'email'],
                    'subject' => ['type' => 'string'],
                    'meta' => ['type' => 'object', 'additionalProperties' => true],
                ],
            ],
            [
                'type' => 'object',
                'required' => ['kind', 'url'],
                'properties' => [
                    'kind' => ['type' => 'string', 'enum' => ['webhook']],
                    'url' => ['type' => 'string', 'format' => 'uri'],
                    'headers' => [
                        'type' => 'object',
                        'additionalProperties' => ['type' => 'string'],
                    ],
                ],
            ],
        ],
    ])]
    private array $payload = [];

    #[ORM\Column]
    #[Groups(['event.read'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getPayload(): array
    {
        return $this->payload;
    }

    public function setPayload(array $payload): self
    {
        $this->payload = $payload;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}

