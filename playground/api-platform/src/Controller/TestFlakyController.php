<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

final class TestFlakyController
{
    public function __construct(
        private readonly CacheInterface $cache,
    ) {
    }

    #[Route('/test/flaky', name: 'test_flaky', methods: ['GET'])]
    public function __invoke(Request $request): JsonResponse
    {
        $key = (string) ($request->query->get('key') ?? 'default');
        $fails = (int) ($request->query->get('fails') ?? 2);
        $fails = max(0, min(10, $fails));

        $cacheKey = 'test_flaky_' . preg_replace('/[^A-Za-z0-9._-]+/', '_', $key);

        $attempt = $this->cache->get($cacheKey, function (ItemInterface $item) {
            $item->expiresAfter(60);
            return 0;
        });

        $attempt++;
        $this->cache->delete($cacheKey);
        $this->cache->get($cacheKey, function (ItemInterface $item) use ($attempt) {
            $item->expiresAfter(60);
            return $attempt;
        });

        if ($attempt <= $fails) {
            return new JsonResponse([
                'ok' => false,
                'key' => $key,
                'attempt' => $attempt,
                'fails' => $fails,
                'message' => 'Simulated failure',
            ], 500);
        }

        return new JsonResponse([
            'ok' => true,
            'key' => $key,
            'attempt' => $attempt,
            'fails' => $fails,
        ]);
    }
}

