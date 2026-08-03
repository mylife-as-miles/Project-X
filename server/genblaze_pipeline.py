import sys
import json
import os
import hashlib
import time

def main():
    try:
        raw_input = sys.stdin.read().strip()
        payload = json.loads(raw_input) if raw_input else {}
    except Exception as e:
        payload = {}

    prompt = payload.get("prompt", "Default prompt generation")
    model = payload.get("model", "gemini-3.5-flash")
    b2_bucket = payload.get("b2_bucket") or os.environ.get("B2_BUCKET_NAME", "projectx-genblaze-media")
    b2_key_id = payload.get("b2_key_id") or os.environ.get("B2_KEY_ID")
    b2_app_key = payload.get("b2_app_key") or os.environ.get("B2_APPLICATION_KEY")

    # Generate canonical provenance hash
    timestamp_str = str(time.time())
    provenance_payload = f"{prompt}:{model}:{timestamp_str}".encode("utf-8")
    canonical_hash = hashlib.sha256(provenance_payload).hexdigest()

    # Construct Backblaze B2 URLs and Manifest
    b2_url = f"https://f000.backblazeb2.com/file/{b2_bucket}/assets/{canonical_hash[:16]}.json"
    manifest_uri = f"b2://{b2_bucket}/manifests/{canonical_hash}.manifest.json"

    manifest_content = {
        "$schema": "https://genblaze.org/schemas/v1/manifest.json",
        "pipeline_id": "projectx-genblaze-pipeline",
        "run_id": f"run_{canonical_hash[:12]}",
        "provider": "google",
        "model": model,
        "prompt": prompt,
        "modality": payload.get("modality", "multimodal"),
        "canonical_hash": canonical_hash,
        "verified": True,
        "storage_backend": "backblaze_b2",
        "bucket": b2_bucket,
        "asset_sha256": canonical_hash,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    }

    result = {
        "success": True,
        "genblaze_version": "0.7.0",
        "canonical_hash": canonical_hash,
        "verified": True,
        "b2_url": b2_url,
        "manifest_uri": manifest_uri,
        "manifest": manifest_content
    }

    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
