#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" != "--confirm-production" ]]; then
  echo "Production deploy is protected."
  echo "Run: ./scripts/deploy-production.sh --confirm-production"
  exit 1
fi

PROD_HOST="fyodorxi@fyodorxi.beget.tech"
LANDING_TARGET="/home/f/fyodorxi/parakot.ru/public_html/"
ADMIN_TARGET="/home/f/fyodorxi/admin.parakot.ru/public_html/"
LANDING_URL="https://parakot.ru"
API_URL="https://parakot.ru/api"

echo "Building admin for production..."
VITE_API_BASE_URL="$API_URL" \
VITE_SITE_BASE_URL="$LANDING_URL" \
npm --prefix admin run build

echo "Deploying admin to production..."
rsync -az --delete admin/dist/ "$PROD_HOST:$ADMIN_TARGET"

echo "Deploying landing to production..."
rsync -az --delete \
  --exclude 'api/' \
  --exclude 'uploads/' \
  landing/ "$PROD_HOST:$LANDING_TARGET"

if [[ "${RUN_SMOKE:-0}" == "1" ]]; then
  echo "Running landing smoke test..."
  PARAKOT_LANDING_URL="$LANDING_URL" npm run smoke:landing
fi

echo "Production deploy complete:"
echo "- $LANDING_URL"
echo "- https://admin.parakot.ru"
