#!/bin/sh
set -e

wait_for_database() {
	echo 'Waiting for database to be ready...'
	ATTEMPTS_LEFT_TO_REACH_DATABASE="${DB_WAIT_TIMEOUT:-60}"
	until [ "$ATTEMPTS_LEFT_TO_REACH_DATABASE" -eq 0 ] || DATABASE_ERROR=$(php bin/console dbal:run-sql -q "SELECT 1" 2>&1); do
		if [ $? -eq 255 ]; then
			ATTEMPTS_LEFT_TO_REACH_DATABASE=0
			break
		fi
		sleep 1
		ATTEMPTS_LEFT_TO_REACH_DATABASE=$((ATTEMPTS_LEFT_TO_REACH_DATABASE - 1))
		echo "Still waiting for database to be ready... Or maybe the database is not reachable. $ATTEMPTS_LEFT_TO_REACH_DATABASE attempts left."
	done

	if [ "$ATTEMPTS_LEFT_TO_REACH_DATABASE" -eq 0 ]; then
		echo 'The database is not up or not reachable:'
		echo "$DATABASE_ERROR"
		exit 1
	fi

	echo 'The database is now ready and reachable'
}

is_worker_mode() {
	value=$(printf '%s' "${APP_MODE:-app}" | tr '[:upper:]' '[:lower:]')
	[ "$value" = "worker" ]
}

if [ "$1" = 'frankenphp' ] || [ "$1" = 'php' ] || [ "$1" = 'bin/console' ]; then
	if [ -f composer.json ] && [ -z "$(ls -A 'vendor/' 2>/dev/null)" ] && command -v composer >/dev/null 2>&1; then
		composer install --prefer-dist --no-progress --no-interaction
	fi

	if ! is_worker_mode && command -v webfront-runtime-config >/dev/null 2>&1; then
		webfront-runtime-config || true
	fi

	if [ -x bin/console ]; then
		php bin/console -V || true
	fi

	if [ -n "${DATABASE_URL:-}" ] && [ -x bin/console ]; then
		wait_for_database

		if ! is_worker_mode && [ "$(find ./migrations -iname '*.php' -print -quit 2>/dev/null)" ]; then
			php bin/console doctrine:migrations:migrate --no-interaction --all-or-nothing
		fi
	fi

	echo 'PHP app ready!'
fi

exec docker-php-entrypoint "$@"
