#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

AWS_PROFILE="joyce-deploy"
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="009160063765"
ECR_REPO="dreambiz-api"
IMAGE_TAG="${1:-latest}"
PLATFORM="linux/amd64"

REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_URI="${REGISTRY}/${ECR_REPO}"

echo "==> Authenticating Docker to ECR ($AWS_REGION, profile $AWS_PROFILE)"
aws ecr get-login-password --region "$AWS_REGION" --profile "$AWS_PROFILE" \
  | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Building image ($PLATFORM)"
docker build --platform "$PLATFORM" -t "$ECR_REPO" .

echo "==> Tagging as $ECR_URI:$IMAGE_TAG"
docker tag "$ECR_REPO:latest" "$ECR_URI:$IMAGE_TAG"

echo "==> Pushing $ECR_URI:$IMAGE_TAG"
docker push "$ECR_URI:$IMAGE_TAG"

echo "==> Done: $ECR_URI:$IMAGE_TAG"
