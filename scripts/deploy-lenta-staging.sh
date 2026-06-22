#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LENTA_HOST="${LENTA_STAGING_HOST:-mil@mil.beget.tech}"
LENTA_TARGET="${LENTA_STAGING_TARGET:-/home/m/mil/lenta.parakot.konekon.ru/public_html/}"
LENTA_URL="${LENTA_STAGING_URL:-http://lenta.parakot.konekon.ru}"

echo "Deploying VK feed to staging..."
rsync -az --delete \
  --exclude 'api/.env' \
  lenta/ "$LENTA_HOST:$LENTA_TARGET"

if [[ "${RUN_SMOKE:-0}" == "1" ]]; then
  echo "Checking staging feed health..."
  curl -fsS "$LENTA_URL/api/health" >/dev/null
fi

echo "Staging feed deploy complete:"
echo "- $LENTA_URL"
