<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\Link;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\UrlGeneratorInterface;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\MessageRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: MessageRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(security: "is_granted('ROLE_USER')"),
        new Get(security: "is_granted('ROLE_USER')"),
        new GetCollection(
            uriTemplate: '/conversations/{conversationId}/messages',
            uriVariables: [
                'conversationId' => new Link(toProperty: 'conversation', fromClass: Conversation::class),
            ],
            security: "is_granted('ROLE_USER')"
        ),
        new Post(security: "is_granted('ROLE_USER')"),
        new Put(security: "is_granted('ROLE_USER')"),
        new Patch(security: "is_granted('ROLE_USER')"),
        new Delete(security: "is_granted('ROLE_USER')"),
    ],
    mercure: [
        'topics' => [
            '@=iri(object, '.UrlGeneratorInterface::ABS_URL.')',
            '@=iri(object.getConversation(), '.UrlGeneratorInterface::ABS_URL.')',
        ],
    ],
)]
#[ApiFilter(SearchFilter::class, properties: ['originalText' => 'partial', 'conversation' => 'exact', 'author' => 'exact'])]
#[ApiFilter(OrderFilter::class, properties: ['id', 'createdAt'])]
class Message
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['message.read', 'conversation.read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Conversation::class, inversedBy: 'messages')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['message.read', 'message.write'])]
    private ?Conversation $conversation = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['message.read', 'message.write'])]
    private ?User $author = null;

    #[ORM\Column(type: 'text')]
    #[Assert\NotBlank]
    #[Groups(['message.read', 'message.write'])]
    private string $originalText = '';

    #[ORM\Column(type: 'json', nullable: true)]
    #[Groups(['message.read', 'message.write'])]
    private ?array $meta = null;

    #[ORM\Column]
    #[Groups(['message.read'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getConversation(): ?Conversation
    {
        return $this->conversation;
    }

    public function setConversation(?Conversation $conversation): self
    {
        $this->conversation = $conversation;
        return $this;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): self
    {
        $this->author = $author;
        return $this;
    }

    public function getContent(): string
    {
        return $this->originalText;
    }

    public function setContent(string $content): self
    {
        $this->originalText = $content;
        return $this;
    }

    public function getOriginalText(): string
    {
        return $this->originalText;
    }

    public function setOriginalText(string $originalText): self
    {
        $this->originalText = $originalText;
        return $this;
    }

    public function getMeta(): ?array
    {
        return $this->meta;
    }

    public function setMeta(?array $meta): self
    {
        $this->meta = $meta;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
