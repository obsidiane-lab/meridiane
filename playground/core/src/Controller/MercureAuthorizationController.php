<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Mercure\Authorization;
use Symfony\Component\Mercure\Jwt\Grant;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Sets the Mercure subscriber cookie. The bridge calls it (`mercure.authorize`) before its first
 * connection and after each connection refused by the hub, e.g. when the token has expired.
 */
#[AsController]
final class MercureAuthorizationController
{
    public function __construct(
        private readonly Authorization $authorization,
        #[Autowire('%env(APP_BASE_URL)%')]
        private readonly string $baseUrl,
        #[Autowire('%env(int:MERCURE_SUBSCRIBER_TTL)%')]
        private readonly int $ttl,
    ) {
    }

    #[Route('/api/mercure/authorization', name: 'api_mercure_authorization', methods: ['GET'])]
    public function __invoke(Request $request): Response
    {
        $baseUrl = rtrim($this->baseUrl, '/');
        $grant = new Grant([Grant::ACTION_SUBSCRIBE], [
            'urlpattern' => [$baseUrl.'/api/conversations/:id', $baseUrl.'/api/messages/:id'],
        ]);

        $response = new Response(null, Response::HTTP_NO_CONTENT, ['Cache-Control' => 'no-store, private']);
        $response->headers->setCookie($this->authorization->createCookie(
            $request,
            [$grant],
            null,
            ['exp' => new \DateTimeImmutable(\sprintf('+%d seconds', $this->ttl))],
        ));

        return $response;
    }
}
