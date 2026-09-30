#!/usr/bin/env bash
# End-to-end deploy: build & push image to ECR, sync .env.production + run-on-droplet.sh
# to the Digital Ocean droplet, then run the deploy there over SSH.
#
# Usage:
#   ./deploy-droplet.sh [image-tag]     # defaults to "latest"
#
# Requires:
#   - api-server/.env.production populated with real production values (gitignored)
#   - AWS CLI configured with the "joyce-deploy" profile locally (see push-to-ecr.sh)
#   - AWS CLI installed and configured with ECR pull access ON THE DROPLET ITSELF
#     (the droplet has no IAM role like the EC2 instance does, so it needs its own
#     credentials — e.g. `aws configure` with an IAM user/key scoped to ECR read)
#   - SSH key at $DROPLET_KEY authorized on the droplet

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

IMAGE_TAG="${1:-latest}"

DROPLET_HOST="143.244.131.123"
DROPLET_USER="root"
DROPLET_KEY="$HOME/.ssh/id_ed25519"
REMOTE_DIR="/root/dreamstore"

if [[ ! -f .env.production ]]; then
  echo "error: .env.production not found in api-server/ — create it before deploying" >&2
  exit 1
fi

echo "==> Building and pushing image to ECR"
./push-to-ecr.sh "$IMAGE_TAG"

echo "==> Ensuring $REMOTE_DIR exists on $DROPLET_HOST"
ssh -i "$DROPLET_KEY" "$DROPLET_USER@$DROPLET_HOST" "mkdir -p $REMOTE_DIR"

echo "==> Syncing .env.production to $DROPLET_HOST:$REMOTE_DIR/api-server.env"
scp -i "$DROPLET_KEY" .env.production "$DROPLET_USER@$DROPLET_HOST:$REMOTE_DIR/api-server.env"

echo "==> Syncing run-on-droplet.sh to $DROPLET_HOST:$REMOTE_DIR/run-on-droplet.sh"
scp -i "$DROPLET_KEY" run-on-droplet.sh "$DROPLET_USER@$DROPLET_HOST:$REMOTE_DIR/run-on-droplet.sh"

echo "==> Running deploy on droplet"
ssh -i "$DROPLET_KEY" "$DROPLET_USER@$DROPLET_HOST" \
  "chmod +x $REMOTE_DIR/run-on-droplet.sh && $REMOTE_DIR/run-on-droplet.sh $IMAGE_TAG"

echo "==> Done"
