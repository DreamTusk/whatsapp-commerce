#!/usr/bin/env bash
# Build and deploy store-customer to Cloudflare Workers via OpenNext.
#
# Usage:
#   ./scripts/deploy.sh
#
# Required env vars, read from .env.deploy (gitignored — copy .env.deploy.example
# and fill in real values), or exported inline, or skip both and rely on a
# `npx wrangler login` session:
#   CLOUDFLARE_API_TOKEN   API token with "Workers Scripts — Edit" permission
#   CLOUDFLARE_ACCOUNT_ID  Account ID shown in the Cloudflare dashboard
#
# Build-time env vars (baked into the bundle, from .env.production):
#   NEXT_PUBLIC_API_URL    Backend API URL

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

if [[ -f .env.deploy ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.deploy
  set +a
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "warning: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set; relying on 'wrangler login' session." >&2
fi

echo "==> Installing dependencies"
npm ci

echo "==> Building Next.js app"
npm run build

echo "==> Building OpenNext Cloudflare Worker"
npx opennextjs-cloudflare build

echo "==> Deploying to Cloudflare Workers"
npx opennextjs-cloudflare deploy

echo "==> Done"
