#!/usr/bin/env bash
# Build and deploy the landing page to Cloudflare Pages via Wrangler.
#
# Usage:
#   CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=xxx ./scripts/deploy.sh
#
# Required env vars (or be logged in via `npx wrangler login`):
#   CLOUDFLARE_API_TOKEN   API token with "Cloudflare Pages — Edit" permission
#   CLOUDFLARE_ACCOUNT_ID  Account ID shown in the Cloudflare dashboard
#
# Optional:
#   PROJECT_NAME  Cloudflare Pages project name (default: landing-page)
#   BRANCH        Branch name to associate the deployment with (default: main)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

PROJECT_NAME="${PROJECT_NAME:-landing-page}"
BRANCH="${BRANCH:-main}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "warning: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set; relying on 'wrangler login' session." >&2
fi

echo "==> Installing dependencies"
npm ci

echo "==> Building static export"
rm -rf out
npm run build

if [[ ! -d out ]]; then
  echo "error: build did not produce an 'out' directory (check next.config.ts has output: 'export')" >&2
  exit 1
fi

echo "==> Deploying '$PROJECT_NAME' (branch: $BRANCH) to Cloudflare Pages"
npx wrangler pages deploy out \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH"

echo "==> Done"
