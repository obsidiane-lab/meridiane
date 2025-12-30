<?php

namespace __BUNDLE_NAMESPACE__\Bridge;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

final class BridgeFacade
{
    private string $baseUrl;
    private array $defaultHeaders;
    private array $defaultOptions;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        string $baseUrl = '',
        array $defaultHeaders = [],
        array $defaultOptions = []
    ) {
        $this->baseUrl = $baseUrl;
        $this->defaultHeaders = $defaultHeaders;
        $this->defaultOptions = $defaultOptions;
    }

    public function request(string $method, string $path, array $options = []): ResponseInterface
    {
        $url = UrlResolver::resolve($this->baseUrl, $path);
        $merged = $this->mergeOptions($options);
        return $this->httpClient->request($method, $url, $merged);
    }

    public function get(string $path, array $options = []): ResponseInterface
    {
        return $this->request('GET', $path, $options);
    }

    public function getCollection(string $path, array $query = [], array $options = []): ResponseInterface
    {
        $withQuery = $this->appendQuery($path, $query);
        return $this->request('GET', $withQuery, $options);
    }

    public function post(string $path, mixed $payload = null, array $options = []): ResponseInterface
    {
        return $this->request('POST', $path, $this->withJsonPayload($payload, $options));
    }

    public function put(string $path, mixed $payload = null, array $options = []): ResponseInterface
    {
        return $this->request('PUT', $path, $this->withJsonPayload($payload, $options));
    }

    public function patch(string $path, mixed $payload = null, array $options = []): ResponseInterface
    {
        return $this->request('PATCH', $path, $this->withJsonPayload($payload, $options));
    }

    public function delete(string $path, array $options = []): ResponseInterface
    {
        return $this->request('DELETE', $path, $options);
    }

    private function withJsonPayload(mixed $payload, array $options): array
    {
        if ($payload === null) return $options;
        if (array_key_exists('json', $options) || array_key_exists('body', $options)) {
            return $options;
        }
        $options['json'] = $payload;
        return $options;
    }

    private function mergeOptions(array $options): array
    {
        $headers = $options['headers'] ?? [];
        $mergedHeaders = array_merge($this->defaultHeaders, $headers);

        $merged = array_merge($this->defaultOptions, $options);
        $merged['headers'] = $mergedHeaders;
        return $merged;
    }

    private function appendQuery(string $path, array $query): string
    {
        if (count($query) === 0) return $path;
        $separator = str_contains($path, '?') ? '&' : '?';
        return $path.$separator.http_build_query($query);
    }
}
