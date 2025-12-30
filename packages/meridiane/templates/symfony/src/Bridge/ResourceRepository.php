<?php

namespace __BUNDLE_NAMESPACE__\Bridge;

use Symfony\Contracts\HttpClient\ResponseInterface;

final class ResourceRepository
{
    private string $resourcePath;

    public function __construct(
        private readonly BridgeFacade $bridge,
        string $resourcePath
    ) {
        $this->resourcePath = $resourcePath;
    }

    public function getCollection(array $query = [], array $options = []): ResponseInterface
    {
        return $this->bridge->getCollection($this->resourcePath, $query, $options);
    }

    public function get(string $iri, array $options = []): ResponseInterface
    {
        return $this->bridge->get($iri, $options);
    }

    public function post(mixed $payload = null, array $options = []): ResponseInterface
    {
        return $this->bridge->post($this->resourcePath, $payload, $options);
    }

    public function put(string $iri, mixed $payload = null, array $options = []): ResponseInterface
    {
        return $this->bridge->put($iri, $payload, $options);
    }

    public function patch(string $iri, mixed $payload = null, array $options = []): ResponseInterface
    {
        return $this->bridge->patch($iri, $payload, $options);
    }

    public function delete(string $iri, array $options = []): ResponseInterface
    {
        return $this->bridge->delete($iri, $options);
    }

    public function request(string $method, string $url, array $options = []): ResponseInterface
    {
        return $this->bridge->request($method, $url, $options);
    }
}
