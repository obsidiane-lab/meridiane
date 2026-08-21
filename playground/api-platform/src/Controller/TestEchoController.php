<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class TestEchoController
{
    #[Route('/test/echo', name: 'test_echo', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])]
    public function __invoke(Request $request): JsonResponse
    {
        $contentType = (string) $request->headers->get('content-type', '');

        $rawBody = $request->getContent();
        $jsonBody = null;
        if ($rawBody !== '' && str_contains(strtolower($contentType), 'json')) {
            try {
                $jsonBody = json_decode($rawBody, true, flags: JSON_THROW_ON_ERROR);
            } catch (\Throwable) {
                $jsonBody = ['_error' => 'invalid_json'];
            }
        }

        $headers = [];
        foreach ($request->headers->all() as $k => $v) {
            if (in_array(strtolower($k), ['authorization', 'cookie'], true)) {
                $headers[$k] = ['<redacted>'];
                continue;
            }
            $headers[$k] = $v;
        }

        return new JsonResponse([
            'method' => $request->getMethod(),
            'path' => $request->getPathInfo(),
            'query' => $request->query->all(),
            'headers' => $headers,
            'contentType' => $contentType,
            'json' => $jsonBody,
            'raw' => $rawBody !== '' ? $rawBody : null,
        ]);
    }
}

