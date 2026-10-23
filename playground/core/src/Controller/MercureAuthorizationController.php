<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Mercure\Authorization;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Sets the Mercure subscriber cookie. The bridge calls it (`mercure.authorize`) before its first
 * connection, and renews it 5 seconds before `expiresIn` elapses: the hub ends each connection before its token
 * expires, and the browser reconnects with the renewed cookie.
 */
#[AsController]
final class MercureAuthorizationController
{
    public function __construct(
        private readonly Authorization $authorization,
        #[Autowire('%env(int:MERCURE_SUBSCRIBER_TTL)%')]
        private readonly int $ttl,
    ) {
    }

    #[Route('/api/mercure/authorization', name: 'api_mercure_authorization', methods: ['GET'])]
    public function __invoke(Request $request): JsonResponse
    {
        $base = $request->getSchemeAndHttpHost();
        $this->authorization->setCookie(
            $request,
            ['urlpattern' => [$base.'/api/conversations/:id', $base.'/api/messages/:id']],
            null,
            ['exp' => new \DateTimeImmutable(\sprintf('+%d seconds', $this->ttl))],
        );

        return new JsonResponse(['expiresIn' => $this->ttl], headers: ['Cache-Control' => 'no-store, private']);
    }
}
