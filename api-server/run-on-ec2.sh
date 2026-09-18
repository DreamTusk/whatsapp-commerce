#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="009160063765"
ECR_REPO="dreambiz-api"
IMAGE_TAG="${1:-latest}"
CONTAINER_NAME="dreamstore-api"
ENV_FILE="/home/ec2-user/dreamstore/api-server.env"

REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE="${REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"

echo "==> Authenticating Docker to ECR ($AWS_REGION)"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Pulling $IMAGE"
docker pull "$IMAGE"

echo "==> Running database migrations"
docker run --rm --env-file "$ENV_FILE" "$IMAGE" npx prisma migrate deploy

echo "==> Stopping existing container (if any)"
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "==> Starting new container"
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  -p 3010:3010 \
  "$IMAGE"

echo "==> Cleaning up old images"
docker image prune -f

echo "==> Deployed $IMAGE as $CONTAINER_NAME"
