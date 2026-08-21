<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Routing\Attribute\Route;

final class TestMercurePublishController
{
    public function __construct(
        private readonly HubInterface $hub,
    ) {
    }

    #[Route('/test/mercure/publish', name: 'test_mercure_publish', methods: ['POST'], env: 'dev')]
    public function __invoke(Request $request): JsonResponse
    {
        $raw = $request->getContent();
        try {
            $body = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return new JsonResponse(['error' => 'invalid_json'], 400);
        }

        if (!is_array($body)) {
            return new JsonResponse(['error' => 'invalid_body'], 400);
        }

        $topic = $body['topic'] ?? null;
        if (!is_string($topic) || $topic === '') {
            return new JsonResponse(['error' => 'missing_topic'], 400);
        }

        $payload = $body['payload'] ?? null;
        if ($payload === null) {
            return new JsonResponse(['error' => 'missing_payload'], 400);
        }

        $data = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $this->hub->publish(new Update($topic, $data));

        return new JsonResponse(['ok' => true]);
    }
}
