SHELL := /bin/bash
NODE ?= node

.PHONY: up init bridge build lint phpstan check down

up:
	docker compose up -d --build --wait --wait-timeout 300

init: up
	docker compose exec -T core php bin/console doctrine:schema:update --force
	docker compose exec -T core php bin/console app:seed
	$(MAKE) bridge

bridge:
	docker compose exec -T core php bin/console api:openapi:export --output=var/openapi.json
	$(NODE) ../packages/meridiane/cli.js generate @app/bridge --version 0.0.0-dev --spec core/var/openapi.json --out webfront/bridge

build:
	cd webfront && npm run build

lint:
	cd webfront && npm run lint

phpstan:
	cd core && vendor/bin/phpstan analyse --no-progress

check: lint build phpstan

down:
	docker compose down
