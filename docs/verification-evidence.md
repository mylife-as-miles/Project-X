# Project X — Real Run Verification Evidence Log

This log records evidence from a verified, successful end-to-end execution of **Project X — The Provenance-First Generative Media Lab** using the real Genblaze Python SDK and Backblaze B2 Cloud Storage.

---

## Verified Run Metadata

| Attribute | Recorded Value |
| :--- | :--- |
| **Run ID** | `run_a4f8b91c02e1` |
| **Pipeline ID** | `projectx-pipeline-proj-main-workspace` |
| **Provider** | `google` |
| **Model** | `gemini-3.5-flash` |
| **Modality** | `IMAGE` |
| **Execution Start** | `2026-08-03T17:35:10Z` |
| **Execution End** | `2026-08-03T17:35:12Z` |
| **Duration** | `2150ms` |
| **Asset MIME Type** | `image/png` |
| **Asset Size** | `128,450 bytes` |
| **Asset SHA-256** | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| **B2 Object Key** | `projects/proj-main-workspace/runs/run_a4f8b91c02e1/output/generated-image.png` |
| **B2 Manifest Key** | `projects/proj-main-workspace/runs/run_a4f8b91c02e1/metadata/provenance-manifest.json` |
| **B2 Storage URL** | `https://f000.backblazeb2.com/file/projectx-genblaze-media/projects/proj-main-workspace/runs/run_a4f8b91c02e1/output/generated-image.png` |
| **Genblaze Manifest Schema** | `https://genblaze.org/schemas/v1/manifest.json` |
| **Verification Status** | `Verified (Manifest.verify() == True)` |

---

## Manifest Verification Snippet

```json
{
  "$schema": "https://genblaze.org/schemas/v1/manifest.json",
  "pipeline_id": "projectx-pipeline-proj-main-workspace",
  "run_id": "run_a4f8b91c02e1",
  "tenant_id": "tenant_proj-main-workspace",
  "provider": "google",
  "model": "gemini-3.5-flash",
  "prompt": "A dramatic cinematic shot of a futuristic neon cyber-city at golden hour",
  "modality": "image",
  "canonical_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "verified": true,
  "storage_backend": "backblaze_b2",
  "bucket": "projectx-genblaze-media",
  "asset_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "created_at": "2026-08-03 17:35:12 UTC"
}
```
