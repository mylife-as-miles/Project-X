import os
import pytest
from fastapi.testclient import TestClient

# Set test environment key
os.environ["GEMINI_API_KEY"] = "test_key_for_unit_tests"

from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "sdk" in data
    assert "configuration" in data

def test_generate_missing_project_id():
    response = client.post("/generate", json={"compiledPrompt": "A futuristic city"})
    # Pydantic validation error or custom error
    assert response.status_code in [400, 422]

def test_generate_missing_compiled_prompt():
    response = client.post("/generate", json={"projectId": "proj-123", "compiledPrompt": ""})
    assert response.status_code in [400, 422]

def test_generate_success():
    payload = {
        "projectId": "proj-test",
        "compiledPrompt": "A dramatic shot of a mountain peak at sunset",
        "provider": "google",
        "model": "gemini-3.5-flash"
    }
    response = client.post("/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "run" in data
    assert "asset" in data
    assert "manifest" in data
    assert data["run"]["status"] == "completed"
    assert len(data["asset"]["sha256"]) == 64
