# Cloud Run migration verification

Verified locally on 2026-09-09. No Cloud Run or ChatGPT Sites deployment was performed.

| Check | Result |
| --- | --- |
| npm ci | Passed; automatic audit disabled after its metadata fetch stalled |
| npm run lint | Passed |
| npm test | 10 suites, 38 tests passed; existing multimodal and authenticity tests retained |
| npm run build | Passed; frontend secret scan passed across 50 generated files |
| npm run build:server | Passed; compiled JavaScript with external runtime dependencies |
| Node 20.20.2 production smoke | Passed; health 200, root 404, allowed origin and rejected origin checks |
| Bash deployment script syntax | Passed |
| Tracked service-account JSON check | None found |
| Environment ignore check | .env and .env.local ignored |
| Docker image build/run | Not verified; Docker Linux daemon unavailable |
| Live Google Cloud integrations | Not verified; gcloud unavailable and account configuration required |

The local smoke test sets K_SERVICE to exercise Cloud Run metadata. It reports Vertex/GCS unconfigured and ClickHouse disconnected. This does not establish a live deployment or successful cloud service calls.

The frontend build emitted the existing large-chunk warning (approximately 586 kB minified JavaScript). The earlier dependency audit reported 26 advisories (20 moderate, 6 high); broad dependency upgrades were not included in this migration. Node 20 was retained as explicitly requested.

For exact deployment commands, IAM roles, environment variables, Secret Manager setup and Sites publishing instructions, see [DEPLOYMENT.md](DEPLOYMENT.md). The remaining work requires your Google Cloud project, billing, authenticated gcloud account, service account/IAM grants, GCS bucket, ClickHouse connection/password, and final Sites origin. Then deploy, verify the live health URL, run an actual video analysis, and publish the frontend with its real public API URL.

## Files changed

- `.dockerignore`
- `.env.example`
- `.gitattributes`
- `.gitignore`
- `CHANGELOG.md`
- `Dockerfile`
- `README.md`
- `api/[...path].ts`
- `api/index.ts`
- `docs/DEPLOYMENT.md`
- `docs/MIGRATION_VERIFICATION.md`
- `docs/TECH_STACK.md`
- `docs/release_notes/v2.0.0.md`
- `docs/release_notes/v2.1.0.md`
- `docs/release_notes/v2.1.1.md`
- `docs/release_notes/v2.2.0.md`
- `package-lock.json`
- `package.json`
- `scripts/build-server.mjs`
- `scripts/deploy-cloud-run.sh`
- `scripts/smoke-server.mjs`
- `scripts/verify-frontend.mjs`
- `server/api.ts`
- `server/app.ts`
- `server/config.ts`
- `server/db/clickhouse.ts`
- `server/gemini/directorAgent.ts`
- `server/index.ts`
- `server/media.ts`
- `server/storage/gcs.ts`
- `src/App.tsx`
- `src/components/CrossGenHistoryModal.tsx`
- `src/components/RegenerationModal.tsx`
- `src/lib/apiClient.ts`
- `src/lib/apiConfig.ts`
- `src/main.tsx`
- `src/vite-env.d.ts`
- `tests/cloudConfig.test.ts`
- `tests/deployment.test.ts`
- `tests/frontendBundle.test.ts`
- `tests/security.test.ts`
- `vite.config.ts`
