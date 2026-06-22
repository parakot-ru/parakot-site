#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" != "--confirm-production" ]]; then
  echo "Production feed deploy is protected."
  echo "Run: ./scripts/deploy-lenta-production.sh --confirm-production"
  exit 1
fi

LENTA_HOST="${LENTA_PRODUCTION_HOST:-fyodorxi@fyodorxi.beget.tech}"
LENTA_TARGET="${LENTA_PRODUCTION_TARGET:-/home/f/fyodorxi/lenta.parakot.ru/public_html/}"
LENTA_URL="${LENTA_PRODUCTION_URL:-https://lenta.parakot.ru}"

echo "Deploying VK feed to production..."
rsync -az --delete \
  --exclude 'api/.env' \
  lenta/ "$LENTA_HOST:$LENTA_TARGET"

if [[ "${RUN_SMOKE:-0}" == "1" ]]; then
  echo "Checking production feed health..."
  curl -fsS "$LENTA_URL/api/health" >/dev/null
fi

echo "Production feed deploy complete:"
echo "- $LENTA_URL"
