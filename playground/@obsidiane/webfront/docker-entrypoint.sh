#!/bin/sh
set -e

cd /app

if [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
	if [ -f package-lock.json ]; then
		npm ci
	else
		npm install
	fi
fi

webfront-runtime-config

exec "$@"
