# Project X — Hackathon Judge Testing Guide

Welcome judges! Follow this step-by-step testing guide to evaluate **Project X — The Provenance-First Generative Media Lab** for the **Backblaze Generative Media Hackathon**.

---

## Quick Testing Flow (1-Minute Walkthrough)

1. **Open the Application**:
   Navigate to the local workspace URL at `http://localhost:3000`.

2. **Select Execution Mode**:
   Under the dynamic parameters on the left sidebar, click **2. Generate Image (Genblaze B2)** to activate the real Genblaze Python pipeline.

3. **Load a Preset**:
   Click **Configure Prompts** in the top navigation bar, select the **Style Architect** system preset, and click **Load Preset**.

4. **Enter Ideas & Variables**:
   In the **Main Objective / Idea** box, enter a scene concept (e.g., *"A dramatic cinematic shot of a futuristic neon cyber-city at golden hour"*).

5. **Execute Genblaze Image Pipeline**:
   Click the green **Execute Genblaze Image Pipeline** button.

6. **Inspect Generation & Backblaze B2 Output**:
   Once execution completes:
   - Observe the generated media asset rendered in the output panel.
   - Look at the **Genblaze Provenance & Backblaze B2 Storage** badge at the bottom of the output panel.
   - Inspect the **Run ID**, **Provider**, **Model**, **Duration**, **SHA-256 Hash**, **B2 Bucket path**, and **Genblaze Verified** badge status.

7. **Reopen from Workspace History**:
   Click **History** in the output panel to view saved runs and reopen previous runs.

---

## Server & Environment Health Inspection

Judges can verify service health and component status directly via the FastAPI health endpoint:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "projectx-genblaze-api",
  "version": "1.0.0",
  "sdk": {
    "genblaze_core": true,
    "genblaze_s3": true,
    "genblaze_google": true,
    "genblaze_openai": true
  },
  "configuration": {
    "b2_configured": true,
    "google_configured": true,
    "openai_configured": true,
    "b2_bucket": "projectx-genblaze-media"
  }
}
```

---

## Automated Unit Tests Execution

Run the Pytest suite to verify Genblaze SDK and API endpoint behavior:

```bash
pytest services/genblaze-api/test_genblaze_api.py
```
