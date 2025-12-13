<?php

namespace App\Controller;

use App\Entity\FileAsset;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\Attribute\AsController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

#[AsController]
final class UploadFileAssetController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        #[Autowire('%kernel.project_dir%')] private readonly string $projectDir,
    ) {
    }

    public function __invoke(Request $request): FileAsset
    {
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile) {
            throw new BadRequestHttpException('Missing multipart field "file".');
        }

        $label = (string) ($request->request->get('label') ?? '');

        $uploadsDir = (string) ($request->server->get('APP_UPLOADS_DIR') ?: ($this->projectDir . '/public/uploads'));
        if (!is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0777, true);
        }

        $safeBase = preg_replace('/[^A-Za-z0-9._-]+/', '-', $file->getClientOriginalName()) ?: 'file';
        $targetName = sprintf('%s-%s', bin2hex(random_bytes(6)), $safeBase);
        $file->move($uploadsDir, $targetName);

        $asset = new FileAsset();
        $asset->setOriginalName($file->getClientOriginalName());
        $asset->setMimeType($file->getClientMimeType());
        $asset->setSize($file->getSize());
        $asset->setPath('/uploads/' . $targetName);

        if ($label !== '') {
            $asset->setOriginalName($label . ' - ' . $asset->getOriginalName());
        }

        $this->em->persist($asset);
        $this->em->flush();

        return $asset;
    }
}
