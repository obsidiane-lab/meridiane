<?php

namespace __BUNDLE_NAMESPACE__\Bridge;

final class UrlResolver
{
    public static function resolve(string $baseUrl, string $path): string
    {
        if (preg_match('/^https?:\/\//i', $path)) {
            return $path;
        }
        if (str_starts_with($path, '//')) {
            return $path;
        }
        if ($baseUrl === '') {
            return $path;
        }
        $base = rtrim($baseUrl, '/');
        $suffix = $path[0] === '/' ? $path : '/'.$path;
        return $base.$suffix;
    }
}
