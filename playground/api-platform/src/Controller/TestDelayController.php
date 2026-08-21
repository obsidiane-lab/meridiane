<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class TestDelayController
{
    #[Route('/test/delay', name: 'test_delay', methods: ['GET'])]
    public function __invoke(Request $request): JsonResponse
    {
        $ms = (int) ($request->query->get('ms') ?? 250);
        $ms = max(0, min(5_000, $ms));
        if ($ms > 0) {
            usleep($ms * 1000);
        }

        return new JsonResponse([
            'delayedMs' => $ms,
            'now' => (new \DateTimeImmutable())->format(\DATE_ATOM),
        ]);
    }
}

