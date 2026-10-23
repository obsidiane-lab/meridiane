ARG FRANKENPHP_VERSION=1
ARG PHP_VERSION=8.5
ARG NODE_VERSION=24

FROM dunglas/frankenphp:${FRANKENPHP_VERSION}-php${PHP_VERSION} AS frankenphp_upstream

# Base FrankenPHP image
FROM frankenphp_upstream AS frankenphp_base

SHELL ["/bin/bash", "-euxo", "pipefail", "-c"]

WORKDIR /app

# persistent deps
# hadolint ignore=DL3008
RUN <<-EOF_INNER
	apt-get update
	apt-get install -y --no-install-recommends \
		file \
		git
	install-php-extensions \
		@composer \
		apcu \
		intl \
		opcache \
		pdo_mysql \
		zip
	rm -rf /var/lib/apt/lists/*
EOF_INNER

# https://getcomposer.org/doc/03-cli.md#composer-allow-superuser
ENV COMPOSER_ALLOW_SUPERUSER=1
ARG APP_VERSION=localhost
ENV APP_VERSION=$APP_VERSION
ENV PHP_INI_SCAN_DIR=":$PHP_INI_DIR/app.conf.d"

COPY --link @obsidiane/frankenphp/conf.d/10-app.ini $PHP_INI_DIR/app.conf.d/
COPY --link --chmod=755 @obsidiane/frankenphp/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
COPY --link --chmod=755 @obsidiane/webfront/runtime-config.sh /usr/local/bin/webfront-runtime-config
COPY --link @obsidiane/caddy/Caddyfile /etc/frankenphp/Caddyfile
COPY --link @obsidiane/caddy/webfront.prod.caddy /etc/frankenphp/webfront.caddy

ENTRYPOINT ["docker-entrypoint"]

HEALTHCHECK --start-period=60s CMD php -r 'exit(false === @file_get_contents("http://localhost:2019/metrics", false, stream_context_create(["http" => ["timeout" => 5]])) ? 1 : 0);'
CMD ["frankenphp", "run", "--config", "/etc/frankenphp/Caddyfile"]

# Dev FrankenPHP image
FROM frankenphp_base AS frankenphp_dev

ENV APP_ENV=dev
ENV APP_DEBUG=1
ENV XDEBUG_MODE=off
ENV FRANKENPHP_SITE_CONFIG=hot_reload
ENV FRANKENPHP_WORKER_CONFIG=watch

RUN <<-EOF_INNER
	mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"
	install-php-extensions xdebug
EOF_INNER

COPY --link @obsidiane/frankenphp/conf.d/20-app.dev.ini $PHP_INI_DIR/app.conf.d/

CMD ["frankenphp", "run", "--config", "/etc/frankenphp/Caddyfile", "--watch"]

FROM node:${NODE_VERSION}-bookworm-slim AS angular-dev
WORKDIR /app
COPY --link --chmod=755 @obsidiane/webfront/docker-entrypoint.sh /usr/local/bin/webfront-docker-entrypoint
COPY --link --chmod=755 @obsidiane/webfront/runtime-config.sh /usr/local/bin/webfront-runtime-config
EXPOSE 80
ENTRYPOINT ["webfront-docker-entrypoint"]
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--port", "80"]
