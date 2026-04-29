#!/bin/sh
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export REDIRECT_STATUS=1
export SCRIPT_FILENAME="$SCRIPT_DIR/index.php"
export SCRIPT_NAME="${SCRIPT_NAME%/*}/index.php"
exec /usr/local/php/cgi/8.2/bin/php-cgi
