# Project X — Real Run Verification Evidence Log

This log records evidence from a verified, successful end-to-end execution of **Project X — The Provenance-First Generative Media Lab** using the real Genblaze Python SDK and Backblaze B2 Cloud Storage.

---

## Verified Run Metadata

| Attribute | Recorded Value |
| :--- | :--- |
| **Run ID** | `run_1785786819` |
| **Pipeline ID** | `projectx-pipeline-workspace` |
| **Provider** | `google` |
| **Model** | `gemini-3.5-flash` |
| **Modality** | `IMAGE` |
| **Execution Start** | `2026-08-03T19:53:39Z` |
| **Execution End** | `2026-08-03T19:53:41Z` |
| **Duration** | `1850ms` |
| **Asset MIME Type** | `image/png` |
| **Asset Size** | `6,625 bytes` |
| **Asset SHA-256** | `d8f2521d08ad386d98153c2fa1118af3a8ab579efd1aba9845dbe82339bdb622` |
| **Independently Recalculated SHA-256** | `d8f2521d08ad386d98153c2fa1118af3a8ab579efd1aba9845dbe82339bdb622` |
| **Cryptographic Hash Match** | `True (100% Exact Match)` |
| **B2 Bucket** | `projectx-genblaze-media` |
| **B2 Region** | `us-east-005` |
| **B2 Object Key** | `projects/workspace/runs/run_1785786819/output/generated-image.png` |
| **B2 Manifest Key** | `projects/workspace/runs/run_1785786819/metadata/provenance-manifest.json` |
| **B2 Asset File ID** | `4_zbcd00c8ef7a8c18f90f00416_f1022ec6e68e7b8c1_d20260803_m195345_c005_v0501048_t0022_u01785786825847` |
| **B2 Manifest File ID** | `4_zbcd00c8ef7a8c18f90f00416_f116741e1fae560ef_d20260803_m195350_c005_v0501045_t0030_u01785786830752` |
| **Genblaze Manifest Schema** | `https://genblaze.org/schemas/v1/manifest.json` |
| **Verification Status** | `Verified (Manifest.verify() == True)` |

---

## Manifest Verification Snippet

```json
{
  "$schema": "https://genblaze.org/schemas/v1/manifest.json",
  "pipeline_id": "projectx-pipeline-workspace",
  "run_id": "run_1785786819",
  "tenant_id": "tenant_workspace",
  "provider": "google",
  "model": "gemini-3.5-flash",
  "prompt": "A small cinematic red robot standing in a clean white studio, product photography",
  "modality": "image",
  "canonical_hash": "d8f2521d08ad386d98153c2fa1118af3a8ab579efd1aba9845dbe82339bdb622",
  "verified": true,
  "storage_backend": "backblaze_b2",
  "bucket": "projectx-genblaze-media",
  "asset_sha256": "d8f2521d08ad386d98153c2fa1118af3a8ab579efd1aba9845dbe82339bdb622",
  "created_at": "2026-08-03T19:53:41Z"
}
```

---

## Independent Download & SHA-256 Verification Script Output

```text
INDEPENDENT BACKBLAZE B2 VERIFICATION:
Downloaded Asset Size: 6625 bytes
Expected SHA-256:     d8f2521d08ad386d98153c2fa1118af3a8ab579efd1aba9845dbe82339bdb622
Recalculated SHA-256: d8f2521d08ad386d98153c2fa1118af3a8ab579efd1aba9845dbe82339bdb622
Cryptographic Hash Match: True
Downloaded Manifest Canonical Hash: d8f2521d08ad386d98153c2fa1118af3a8ab579efd1aba9845dbe82339bdb622
Manifest Verification Flag: True
```
