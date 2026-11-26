#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

for command in php composer node npm npx curl; do
    if ! command -v "$command" >/dev/null 2>&1; then
        printf 'Missing %s. Install it in the same terminal that runs this preview.\n' "$command" >&2
        exit 1
    fi
done

if ! php -r 'exit(PHP_VERSION_ID < 80400 || !extension_loaded("xml") ? 1 : 0);'; then
    printf 'The preview needs PHP 8.4 or newer with its XML extension. Run php -v and php --ri xml to check your CLI.\n' >&2
    exit 1
fi

port=${PG_PREVIEW_PORT:-8000}
if [[ ! $port =~ ^[1-9][0-9]{0,4}$ ]] || (( port > 65535 )); then
    printf 'PG_PREVIEW_PORT must be a port number from 1 to 65535.\n' >&2
    exit 1
fi

export APP_ENV=prod APP_DEBUG=0
composer install --no-interaction
npx --yes yarn@1.22.22 install --frozen-lockfile --non-interactive
npm run preview:assets
npm run build
php bin/console cache:clear

node -e '
    const entries = require("./public/build/entrypoints.json").entrypoints;
    console.log("Preview build " + entries["js/main"].js.at(-1).split("/").at(-1));
'
printf 'Open http://localhost:%s/en_GB/. Keep this terminal open while testing.\n' "$port"
exec php -S "127.0.0.1:$port" -t public
