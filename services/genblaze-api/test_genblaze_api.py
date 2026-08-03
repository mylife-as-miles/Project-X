import os
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import main
from main import app

client = TestClient(app)


def test_health_check_does_not_expose_secrets(monkeypatch):
    monkeypatch.setenv("B2_KEY_ID", "secret-key-id")
    monkeypatch.setenv("B2_APP_KEY", "secret-app-key")
    monkeypatch.setenv("B2_BUCKET_NAME", "test-bucket")
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["configuration"]["b2_configured"] is True
    assert "secret-key-id" not in response.text
    assert "secret-app-key" not in response.text


def test_generate_rejects_empty_prompt():
    response = client.post("/generate", json={"projectId": "proj-123", "compiledPrompt": ""})
    assert response.status_code == 422


def install_fake_pipeline(monkeypatch, *, verify=True, fail=None):
    calls = {"step": None, "sink": None, "timeout": None}

    class FakeManifest:
        canonical_hash = "b" * 64
        url = "https://f000.backblazeb2.com/file/test-bucket/manifests/run-123.json"

        def verify(self):
            return verify

        def model_dump(self):
            return {"canonical_hash": self.canonical_hash}

    asset = SimpleNamespace(
        url="https://f000.backblazeb2.com/file/test-bucket/runs/run-123/generated-image.png",
        sha256="a" * 64,
        mime_type="image/png",
        size_bytes=12345,
    )
    step = SimpleNamespace(assets=[asset], provider="google-gemini-image", model="gemini-2.5-flash-image")
    run = SimpleNamespace(id="run-123", pipeline_id="projectx-proj-test", steps=[step])
    result = SimpleNamespace(run=run, manifest=FakeManifest())

    class FakePipeline:
        def __init__(self, pipeline_id):
            self.pipeline_id = pipeline_id

        def step(self, provider, **kwargs):
            calls["step"] = {"provider": provider, **kwargs}
            return self

        def run(self, *, sink, timeout):
            calls["sink"] = sink
            calls["timeout"] = timeout
            if fail:
                raise fail
            return result

    monkeypatch.setattr(main, "GENBLAZE_CORE_AVAILABLE", True)
    monkeypatch.setattr(main, "Pipeline", FakePipeline)
    monkeypatch.setattr(main, "Modality", SimpleNamespace(IMAGE="image"))
    monkeypatch.setattr(main, "_build_storage", lambda: "real-storage-sink")
    monkeypatch.setattr(
        main,
        "_select_provider",
        lambda provider, model: ("real-provider", "gemini-2.5-flash-image", "google-gemini-image"),
    )
    monkeypatch.setenv("B2_BUCKET_NAME", "test-bucket")
    return calls


def test_generate_executes_pipeline_and_uses_returned_asset(monkeypatch):
    calls = install_fake_pipeline(monkeypatch)
    response = client.post(
        "/generate",
        json={
            "projectId": "proj-test",
            "compiledPrompt": "A cinematic red robot",
            "provider": "google",
            "model": "gemini-3.5-flash",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert calls["step"]["provider"] == "real-provider"
    assert calls["step"]["model"] == "gemini-2.5-flash-image"
    assert calls["sink"] == "real-storage-sink"
    assert body["asset"]["url"].endswith("generated-image.png")
    assert body["asset"]["sha256"] == "a" * 64
    assert body["manifest"]["verified"] is True
    assert body["run"]["id"] == "run-123"


def test_failed_manifest_verification_never_reports_success(monkeypatch):
    install_fake_pipeline(monkeypatch, verify=False)
    response = client.post(
        "/generate",
        json={"projectId": "proj-test", "compiledPrompt": "A cinematic red robot"},
    )
    assert response.status_code == 500
    body = response.json()["detail"]
    assert body["success"] is False
    assert body["error"]["code"] == "VERIFICATION_FAILED"


def test_provider_failure_returns_honest_error(monkeypatch):
    install_fake_pipeline(monkeypatch, fail=RuntimeError("provider request failed"))
    response = client.post(
        "/generate",
        json={"projectId": "proj-test", "compiledPrompt": "A cinematic red robot"},
    )
    assert response.status_code == 502
    body = response.json()["detail"]
    assert body["success"] is False
    assert body["error"]["code"] == "GENERATION_FAILED"


@pytest.mark.integration
def test_real_genblaze_b2_image_pipeline():
    if os.getenv("RUN_GENBLAZE_INTEGRATION") != "1":
        pytest.skip("Set RUN_GENBLAZE_INTEGRATION=1 to run the credential-backed provider/B2 test.")

    required = ["B2_KEY_ID", "B2_BUCKET_NAME"]
    assert all(os.getenv(name) for name in required)
    assert os.getenv("B2_APP_KEY") or os.getenv("B2_APPLICATION_KEY")
    assert os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("OPENAI_API_KEY")

    response = client.post(
        "/generate",
        json={
            "projectId": "integration",
            "compiledPrompt": "A small cinematic red robot standing in a clean white studio, professional product photography, softbox lighting, highly detailed",
            "provider": os.getenv("GENBLAZE_INTEGRATION_PROVIDER", "google"),
            "model": os.getenv("GENBLAZE_INTEGRATION_MODEL") or None,
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    assert body["manifest"]["verified"] is True
    assert body["asset"]["url"].startswith(("https://", "s3://", "b2://"))
    assert len(body["asset"]["sha256"]) == 64
