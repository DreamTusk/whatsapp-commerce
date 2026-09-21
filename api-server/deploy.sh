#!/usr/bin/env bash
# End-to-end deploy: build & push image to ECR, sync .env.production + run-on-ec2.sh
# to the EC2 instance, then run the deploy there over SSH.
#
# Usage:
#   ./deploy.sh [image-tag]     # defaults to "latest"
#
# Requires:
#   - api-server/.env.production populated with real production values (gitignored)
#   - AWS CLI configured with the "joyce-deploy" profile (see push-to-ecr.sh)
#   - SSH key at $EC2_KEY authorized on the instance (see api-server/README or chat history
#     for how this was bootstrapped via EC2 Instance Connect)

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

IMAGE_TAG="${1:-latest}"

EC2_HOST="ec2-13-126-120-217.ap-south-1.compute.amazonaws.com"
EC2_USER="ec2-user"
EC2_KEY="$HOME/.ssh/dreambiz-ec2"
REMOTE_DIR="/home/ec2-user/dreamstore"

if [[ ! -f .env.production ]]; then
  echo "error: .env.production not found in api-server/ — create it before deploying" >&2
  exit 1
fi

echo "==> Building and pushing image to ECR"
./push-to-ecr.sh "$IMAGE_TAG"

echo "==> Syncing .env.production to $EC2_HOST:$REMOTE_DIR/api-server.env"
scp -i "$EC2_KEY" .env.production "$EC2_USER@$EC2_HOST:$REMOTE_DIR/api-server.env"

echo "==> Syncing run-on-ec2.sh to $EC2_HOST:$REMOTE_DIR/run-on-ec2.sh"
scp -i "$EC2_KEY" run-on-ec2.sh "$EC2_USER@$EC2_HOST:$REMOTE_DIR/run-on-ec2.sh"

echo "==> Running deploy on EC2"
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" \
  "chmod +x $REMOTE_DIR/run-on-ec2.sh && $REMOTE_DIR/run-on-ec2.sh $IMAGE_TAG"

echo "==> Done"
