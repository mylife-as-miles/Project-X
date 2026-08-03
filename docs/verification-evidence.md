# Project X — Genblaze Verification Evidence

## Evidence status

The earlier `run_1785786819` record has been withdrawn. That file was created locally with Pillow and uploaded directly to Backblaze B2, so it did **not** prove that an image provider ran through Genblaze. It must not be used in the Devpost submission as provider or Genblaze evidence.

The application code now requires a genuine provider-backed Genblaze pipeline:

```python
result = (
    Pipeline(pipeline_id)
    .step(
        provider,
        model=model,
        prompt=compiled_prompt,
        modality=Modality.IMAGE,
    )
    .run(sink=storage, timeout=180)
)
```

A run is reported as successful only when all of the following are true:

1. A real Genblaze image provider returns an asset.
2. `ObjectStorageSink(S3StorageBackend.for_backblaze(...))` persists the asset.
3. The returned asset has a non-local URL and a valid SHA-256 value.
4. The SDK returns a manifest.
5. `result.manifest.verify()` returns `True`.

## Credential-backed verification command

From the repository root, with the real server-side credentials loaded:

```powershell
$env:RUN_GENBLAZE_INTEGRATION="1"
python -m pytest services/genblaze-api/test_genblaze_api.py -m integration -v -s
```

Required environment variables:

```text
B2_KEY_ID
B2_APP_KEY or B2_APPLICATION_KEY
B2_BUCKET_NAME
GEMINI_API_KEY or GOOGLE_API_KEY
```

Optional provider controls:

```text
GENBLAZE_INTEGRATION_PROVIDER=google
GENBLAZE_INTEGRATION_MODEL=gemini-2.5-flash-image
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
IMAGEN_MODEL=imagen-3.0-generate-002
```

## Evidence to record after the real run

Do not fill this section using manually created media or manually assembled JSON.

| Attribute | Real value |
| :--- | :--- |
| Provider class | Pending credential-backed run |
| Model | Pending credential-backed run |
| Pipeline ID | Pending credential-backed run |
| Genblaze run ID | Pending credential-backed run |
| Asset URL | Pending credential-backed run |
| Asset B2 key | Pending credential-backed run |
| Asset MIME type | Pending credential-backed run |
| Asset size | Pending credential-backed run |
| Asset SHA-256 | Pending credential-backed run |
| Manifest canonical hash | Pending credential-backed run |
| `manifest.verify()` | Pending credential-backed run |
| Generated-image screenshot | Pending credential-backed run |

The screenshot must visibly show an AI-generated image produced through Project X, not a placeholder, test card, manually drawn image, or pre-existing upload.
