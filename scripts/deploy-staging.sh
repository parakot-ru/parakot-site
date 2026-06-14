#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ADMIN_HOST="mil@mil.beget.tech"
LANDING_TARGET="/home/m/mil/parakot.konekon.ru/public_html/"
ADMIN_TARGET="/home/m/mil/admin.konekon.ru/public_html/"
LANDING_URL="http://parakot.konekon.ru"
API_URL="http://parakot.konekon.ru/api"

echo "Building admin for staging..."
VITE_API_BASE_URL="$API_URL" \
VITE_SITE_BASE_URL="$LANDING_URL" \
npm --prefix admin run build

echo "Deploying admin to staging..."
rsync -az --delete admin/dist/ "$ADMIN_HOST:$ADMIN_TARGET"

echo "Deploying landing to staging..."
rsync -az --delete \
  --exclude 'api/' \
  --exclude 'uploads/' \
  landing/ "$ADMIN_HOST:$LANDING_TARGET"

if [[ "${RUN_SMOKE:-0}" == "1" ]]; then
  echo "Running landing smoke test..."
  PARAKOT_LANDING_URL="$LANDING_URL" npm run smoke:landing
fi

echo "Staging deploy complete:"
echo "- $LANDING_URL"
echo "- http://admin.konekon.ru"
