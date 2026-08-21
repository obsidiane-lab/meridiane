<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class AuthMeController extends AbstractController
{
    #[Route('/api/auth/me', name: 'auth_me', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        $u = $this->getUser();
        if (!$u) {
            return $this->json(['user' => null], 401);
        }

        return $this->json([
            'user' => [
                'id' => method_exists($u, 'getId') ? $u->getId() : null,
                'userIdentifier' => $u->getUserIdentifier(),
                'roles' => method_exists($u, 'getRoles') ? $u->getRoles() : [],
            ],
        ]);
    }
}
