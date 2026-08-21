<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Controller\UploadFileAssetController;
use App\Repository\FileAssetRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: FileAssetRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(
            uriTemplate: '/file_assets/upload',
            inputFormats: ['multipart' => ['multipart/form-data']],
            controller: UploadFileAssetController::class,
            deserialize: false,
        ),
        new Delete(security: "is_granted('ROLE_USER')"),
    ],
    mercure: true,
)]
class FileAsset
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['file.read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['file.read', 'file.write'])]
    private string $originalName = '';

    #[ORM\Column(length: 255)]
    #[Groups(['file.read'])]
    private string $path = '';

    #[ORM\Column(length: 120, nullable: true)]
    #[Groups(['file.read', 'file.write'])]
    private ?string $mimeType = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['file.read', 'file.write'])]
    private ?int $size = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['file.read', 'file.write'])]
    #[ApiProperty(openapiContext: ['type' => 'string', 'format' => 'date-time'])]
    private ?\DateTimeImmutable $uploadedAt = null;

    public function __construct()
    {
        $this->uploadedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getOriginalName(): string
    {
        return $this->originalName;
    }

    public function setOriginalName(string $originalName): self
    {
        $this->originalName = $originalName;
        return $this;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function setPath(string $path): self
    {
        $this->path = $path;
        return $this;
    }

    public function getMimeType(): ?string
    {
        return $this->mimeType;
    }

    public function setMimeType(?string $mimeType): self
    {
        $this->mimeType = $mimeType;
        return $this;
    }

    public function getSize(): ?int
    {
        return $this->size;
    }

    public function setSize(?int $size): self
    {
        $this->size = $size;
        return $this;
    }

    public function getUploadedAt(): ?\DateTimeImmutable
    {
        return $this->uploadedAt;
    }
}
