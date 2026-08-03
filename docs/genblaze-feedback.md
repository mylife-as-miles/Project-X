# Developer Feedback — Genblaze Python SDK & Backblaze B2

**SDK Package**: `genblaze-core` v0.3.8, `genblaze-s3` v0.3.6, `genblaze-google` v0.3.4  
**Environment**: Python 3.12, Windows 11, FastAPI 0.141  

---

## Key Observations & Feedback Points

### 1. Strengths
- **Unified Pipeline Model**: The `Pipeline` and `Step` architecture simplifies orchestrating multi-step media workflows across different generative AI providers.
- **Backblaze B2 Integration**: `S3StorageBackend.for_backblaze("bucket_name")` provides a seamless helper for configuring S3-compatible Backblaze B2 storage sinks without manually typing S3 endpoint URLs.
- **Canonical Provenance Manifests**: Built-in manifest generation (`$schema: https://genblaze.org/schemas/v1/manifest.json`) and SHA-256 integrity hashing solve a key trust problem in AI-generated media workflows.

### 2. Feature Requests & Opportunities
- **TypeScript / Node.js Native SDK Support**: While `@genblaze/spec` supplies manifest types for TypeScript, a native `@genblaze/sdk` package for Node.js / Next.js would allow JavaScript/TypeScript web applications to run Genblaze pipelines without requiring a Python microservice layer.
- **Async Sink Flushing**: Adding async/non-blocking streaming options for `ObjectStorageSink` would improve responsiveness when uploading large video or audio media files to Backblaze B2.
