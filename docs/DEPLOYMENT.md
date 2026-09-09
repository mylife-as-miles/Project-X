# Production deployment

ChatGPT Sites hosts the React frontend. Google Cloud Run hosts the API and Google ADK agent, using Gemini 2.5 on Vertex AI, GCS, and ClickHouse Cloud. No server is hosted by Sites. The retained `api/` adapters and `vercel.json` are legacy, optional files and are not used by the Docker image.

## Service identity and IAM

Use a dedicated `project-x-api` service account. Cloud Run supplies Application Default Credentials automatically. Do not set `GOOGLE_APPLICATION_CREDENTIALS`, mount a JSON key, or configure `GEMINI_API_KEY` in production. Locally, use `gcloud auth application-default login`; a key file or Developer API key remains an optional local alternative.

Grant the runtime identity:

| Resource | Role | Purpose |
| --- | --- | --- |
| Vertex project | `roles/aiplatform.user` | Gemini generative calls |
| Configured artifact bucket only | `roles/storage.objectUser` | Read/write artifact and media objects |
| ClickHouse password secret only | `roles/secretmanager.secretAccessor` | Read mapped password version |

An existing separate media bucket needs only `roles/storage.objectViewer`. No project Owner role is required. The deployer needs permission to deploy Cloud Run, submit builds, publish to Artifact Registry, and `roles/iam.serviceAccountUser` on the runtime identity. The build identity needs registry write access. Organization policy may restrict public invocations; an administrator must resolve that for this public hackathon frontend.

Google references: [Cloud Run service identity and ADC](https://docs.cloud.google.com/run/docs/securing/service-identity), [secret environment mappings](https://docs.cloud.google.com/run/docs/configuring/services/secrets), [Vertex AI agent authentication](https://docs.cloud.google.com/run/docs/ai/authenticate-agents).

## Account setup (Bash / Cloud Shell)

Replace every placeholder. Create resources only if they do not already exist. Enable billing and authenticate `gcloud` using your own account first.

```bash
export PROJECT_ID='YOUR_PROJECT_ID'
export REGION='us-central1'
export GCS_BUCKET_NAME='YOUR_UNIQUE_BUCKET_NAME'
export SITE_ORIGIN='https://YOUR_FINAL_SITE.chatgpt.site'
export SERVICE_ACCOUNT="project-x-api@${PROJECT_ID}.iam.gserviceaccount.com"
export CLICKHOUSE_HOST='https://YOUR_HOST.clickhouse.cloud:8443'
export CLICKHOUSE_USER='default'
export CLICKHOUSE_DATABASE='default'
export CLICKHOUSE_PASSWORD_SECRET='project-x-clickhouse-password'
export CLICKHOUSE_PASSWORD_VERSION='1'

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com storage.googleapis.com secretmanager.googleapis.com --project "$PROJECT_ID"
gcloud artifacts repositories create project-x --repository-format docker --location "$REGION" --project "$PROJECT_ID"
gcloud iam service-accounts create project-x-api --project "$PROJECT_ID"
gcloud storage buckets create "gs://$GCS_BUCKET_NAME" --project "$PROJECT_ID" --location "$REGION" --uniform-bucket-level-access
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$SERVICE_ACCOUNT" --role roles/aiplatform.user
gcloud storage buckets add-iam-policy-binding "gs://$GCS_BUCKET_NAME" --member "serviceAccount:$SERVICE_ACCOUNT" --role roles/storage.objectUser
gcloud secrets create "$CLICKHOUSE_PASSWORD_SECRET" --replication-policy automatic --project "$PROJECT_ID"
read -rs -p 'ClickHouse password: ' CH_SECRET
printf '%s' "$CH_SECRET" | gcloud secrets versions add "$CLICKHOUSE_PASSWORD_SECRET" --data-file=- --project "$PROJECT_ID"
unset CH_SECRET
gcloud secrets add-iam-policy-binding "$CLICKHOUSE_PASSWORD_SECRET" --project "$PROJECT_ID" --member "serviceAccount:$SERVICE_ACCOUNT" --role roles/secretmanager.secretAccessor
```

Set `CLICKHOUSE_PASSWORD_VERSION` to the numeric version just created. Rotate by adding a version and deploying a new revision pointing at that version. Keep all sensitive future credentials in Secret Manager. Do not paste passwords into scripts, command history, frontend configuration, or image build arguments.

## Build and deploy the API

From the repository root after the setup above:

```bash
bash scripts/deploy-cloud-run.sh
```

The script runs these exact build/deployment commands with your exported values:

```bash
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/project-x/project-x-api:$(git rev-parse --short HEAD)"
gcloud builds submit --project "$PROJECT_ID" --ignore-file .dockerignore --tag "$IMAGE" .
gcloud run deploy project-x-api \
  --project "$PROJECT_ID" --image "$IMAGE" --region "$REGION" --platform managed \
  --allow-unauthenticated --service-account "$SERVICE_ACCOUNT" \
  --port 8080 --memory 1Gi --cpu 1 --concurrency 4 --max-instances 3 --timeout 300 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${REGION},GCS_BUCKET_NAME=${GCS_BUCKET_NAME},CHATGPT_SITE_ORIGIN=${SITE_ORIGIN},CLICKHOUSE_HOST=${CLICKHOUSE_HOST},CLICKHOUSE_USER=${CLICKHOUSE_USER:-default},CLICKHOUSE_DATABASE=${CLICKHOUSE_DATABASE:-default},DEMO_MODE=false" \
  --set-secrets "CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD_SECRET}:${CLICKHOUSE_PASSWORD_VERSION}"
```

The multi-stage Node 20 image compiles backend TypeScript to JavaScript, installs only production dependencies in the runtime stage, retains the required benchmark MP4 and demo fixture, and runs as the unprivileged `node` user. `.dockerignore` also controls the Cloud Build upload, excluding local environment files and caches. The image copies only explicit runtime paths; it does not copy the frontend build or service account files.

The API is publicly callable to support browser access. CORS restricts browser origins; it is not authentication for non-browser callers. Maximum instances/concurrency bound scaling but are not a per-user quota. The current hackathon workflow has no user authentication. Use an authenticated gateway before offering a private or paid service.

## Environment settings

| Variable | Where / meaning |
| --- | --- |
| `VITE_API_BASE_URL` | Public frontend build only; HTTPS Cloud Run origin, without `/api` |
| `GOOGLE_CLOUD_PROJECT` | Backend Vertex project; required for production Gemini |
| `GOOGLE_CLOUD_LOCATION` | Backend Vertex location; default `us-central1` |
| `GCS_BUCKET_NAME` | Backend artifact bucket |
| `GCS_PROJECT_ID` | Optional bucket project override; defaults to the Vertex project |
| `CHATGPT_SITE_ORIGIN` | Final exact HTTPS frontend origin |
| `ALLOWED_ORIGINS` | Optional comma-separated additional exact HTTPS origins |
| `MEDIA_ALLOWED_HOSTS` | Optional comma-separated trusted HTTPS video hostnames |
| `CLICKHOUSE_HOST`, `CLICKHOUSE_USER`, `CLICKHOUSE_DATABASE` | Server-only ClickHouse settings |
| `CLICKHOUSE_PASSWORD` | Server-only Secret Manager mapping |
| `DEMO_MODE` | Default false; only true permits seeded backend history |
| `PORT` | Cloud Run sets this to 8080 |

The script intentionally replaces environment settings. If you need `ALLOWED_ORIGINS`, `MEDIA_ALLOWED_HOSTS`, or cross-project `GCS_PROJECT_ID`, add them to the deployment environment configuration and preserve them on subsequent deploys. For comma-containing values use a Cloud Run environment YAML file with `--env-vars-file`, rather than an unescaped `--set-env-vars` list. Keep secrets out of this file.

ClickHouse must accept outbound traffic from Cloud Run. If its IP allowlist requires fixed addresses, configure Cloud Run VPC egress with Cloud NAT or update the service's network policy. Startup attempts the existing table creation; the database user needs the existing schema's CREATE, SELECT, and INSERT permissions. Do not use a fabricated Connected badge to diagnose access: health pings the server, and a failed query remains distinct from an empty result.

## ChatGPT Sites Frontend

1. Build/publish the existing React frontend through ChatGPT Sites.
2. Set `VITE_API_BASE_URL` to the Cloud Run service origin before building (`npm run build`). If your Sites publishing flow consumes build files, build with this setting and publish `dist/`.
3. Set the backend `CHATGPT_SITE_ORIGIN` to the final published Sites origin, with no path or trailing slash.
4. Rebuild/publish whenever the API URL changes. Do not put backend secrets in any `VITE_*` variable.

ChatGPT Sites = frontend. Cloud Run = backend. Production requests fail with a configuration error if the API base is missing. Local `npm run dev` can use the integrated API with a blank API base; localhost 3000/5173 are allowed only outside production.

## Media and verification

Prefer `gs://bucket/video.mp4` for large videos. The service account needs read access to that bucket; no browser base64 transfer or uploader is required. For direct public HTTPS MP4/WebM URLs, configure trusted `MEDIA_ALLOWED_HOSTS`; downloads reject private addresses and redirects and are limited to 20 MiB and 30 seconds. The API JSON limit is 1 MiB; inline video strings are rejected by payload length limits. Bundled `public/benchmark/*.mp4` remains supported; arbitrary server files are not accessible. Existing YouTube limitations remain truthful.

```bash
npm ci
npm run lint
npm test
npm run build
npm run build:server
node scripts/smoke-server.mjs
NODE_ENV=production PORT=8080 npm start
# In another terminal:
curl --fail http://localhost:8080/api/health
```

For an image smoke test use `docker build -t project-x-api .` and `docker run --rm -p 8080:8080 project-x-api`, then call health. Missing cloud configuration should be reported as unconfigured/disconnected, not Connected.

After deployment, call the live `/api/health`, then send an OPTIONS preflight from the configured Sites origin and one unknown origin (expected 403). Health's `status: ok` means the API is running; `configured` is not a successful Vertex/GCS request. Verify a real analysis with your own accessible video, confirm GCS reports `Google Cloud Storage — Saved`, and query ClickHouse history before claiming the cloud integrations work. Browser Fetch intentionally cannot distinguish a blocked CORS response from a network failure; the client explains both possibilities rather than inventing a diagnosis.
