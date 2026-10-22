#!/bin/sh
set -eu

TARGET=""
for base in /app/public/app/assets /app/src/assets; do
  if [ -d "$base" ]; then
    TARGET="$base/config.json"
    break
  fi
done

has_env="false"
APP_ENV_VALUE="${APP_ENV:-}"
APP_BASE_URL_VALUE="${APP_BASE_URL:-}"
MERCURE_PUBLIC_URL_VALUE="${MERCURE_PUBLIC_URL:-}"
APP_VERSION_VALUE="${APP_VERSION:-}"
for value in \
  "${APP_ENV_VALUE:-}" \
  "${APP_BASE_URL_VALUE:-}" \
  "${MERCURE_PUBLIC_URL_VALUE:-}" \
  "${APP_VERSION_VALUE:-}"
do
  if [ -n "$value" ]; then
    has_env="true"
    break
  fi
done

if [ -n "$TARGET" ] && [ "$has_env" = "true" ]; then
  mkdir -p "$(dirname "$TARGET")"

  escape_json() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
  }

  app_entries=""
  append_app_entry() {
    key=$1
    value=$2
    if [ -n "$value" ]; then
      if [ -n "$app_entries" ]; then
        app_entries="${app_entries},"
      fi
      app_entries="${app_entries}\"$key\": \"$(escape_json "$value")\""
    fi
  }

  append_app_json_entry() {
    key=$1
    value=$2
    if [ -n "$value" ]; then
      if [ -n "$app_entries" ]; then
        app_entries="${app_entries},"
      fi
      app_entries="${app_entries}\"$key\": $value"
    fi
  }

  production_json="false"
  if [ -n "${APP_ENV_VALUE:-}" ] && [ "$APP_ENV_VALUE" = "prod" ]; then
    production_json="true"
  fi

  append_app_json_entry "production" "$production_json"
  append_app_entry "apiBaseUrl" "${APP_BASE_URL_VALUE:-}"
  append_app_entry "mercureHubUrl" "${MERCURE_PUBLIC_URL_VALUE:-}"
  append_app_entry "version" "${APP_VERSION_VALUE:-}"

  if [ -n "$app_entries" ]; then
    cat > "$TARGET" <<EOF_JSON
{
  "app": {
    $app_entries
  }
}
EOF_JSON
  fi
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi
