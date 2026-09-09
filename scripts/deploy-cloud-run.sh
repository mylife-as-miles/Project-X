#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${PROJECT_ID:?Set PROJECT_ID}"
: "${SITE_ORIGIN:?Set the final HTTPS ChatGPT Sites origin}"
: "${GCS_BUCKET_NAME:?Set GCS_BUCKET_NAME}"
: "${CLICKHOUSE_HOST:?Set CLICKHOUSE_HOST}"
: "${CLICKHOUSE_PASSWORD_SECRET:?Set the Secret Manager secret name}"
: "${CLICKHOUSE_PASSWORD_VERSION:?Set a numeric secret version}"
REGION="${REGION:-us-central1}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-project-x-api@${PROJECT_ID}.iam.gserviceaccount.com}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/project-x/project-x-api:$(git rev-parse --short HEAD)"
gcloud builds submit --project "$PROJECT_ID" --ignore-file .dockerignore --tag "$IMAGE" .
gcloud run deploy project-x-api \
  --project "$PROJECT_ID" --image "$IMAGE" --region "$REGION" --platform managed \
  --allow-unauthenticated --service-account "$SERVICE_ACCOUNT" \
  --port 8080 --memory 1Gi --cpu 1 --concurrency 4 --max-instances 3 --timeout 300 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${REGION},GCS_BUCKET_NAME=${GCS_BUCKET_NAME},CHATGPT_SITE_ORIGIN=${SITE_ORIGIN},CLICKHOUSE_HOST=${CLICKHOUSE_HOST},CLICKHOUSE_USER=${CLICKHOUSE_USER:-default},CLICKHOUSE_DATABASE=${CLICKHOUSE_DATABASE:-default},DEMO_MODE=false" \
  --set-secrets "CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD_SECRET}:${CLICKHOUSE_PASSWORD_VERSION}"
URL="$(gcloud run services describe project-x-api --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"
curl --fail --show-error "$URL/api/health"
printf '\nFrontend build setting: VITE_API_BASE_URL=%s\n' "$URL"
