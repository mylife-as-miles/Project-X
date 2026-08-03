# Project X — Hackathon 3-Minute Demo Video Script

**Title**: Project X — The Provenance-First Generative Media Lab  
**Hackathon**: Backblaze Generative Media Hackathon: Build with Genblaze on B2  
**Target Duration**: 2 minutes 55 seconds  

---

### Timecoded Script

| Timecode | Visual Focus | Voiceover / Script |
| :--- | :--- | :--- |
| **0:00 – 0:15** | Project X Hero Header & Logo | *"Generative AI media is exploding, but creators and teams face a major challenge: tracking how media was generated, preserving exact prompt templates, and permanently storing assets with verifiable cryptographic provenance."* |
| **0:15 – 0:35** | Workspace & Dynamic Variable Form | *"Welcome to Project X — The Provenance-First Generative Media Lab. Creators start by selecting a built-in cinematic preset or drafting custom prompt templates with dynamic `{{ variable }}` placeholders that generate reactive form inputs automatically."* |
| **0:35 – 0:55** | Visual Assets Section & Reference Map | *"Creators can attach visual reference images and MP4 clips mapped to `@imageN` and `@videoN` annotations, establishing clear aesthetic baselines before generation."* |
| **0:55 – 1:30** | Mode Switcher & Pipeline Execution | *"Now, let's switch to Execution Mode: 'Generate Image (Genblaze B2)' and click Execute. Behind the scenes, Project X dispatches our compiled instructions to our FastAPI microservice running the real Genblaze Python SDK."* |
| **1:30 – 1:55** | Generated Output & B2 Storage Badge | *"The image generation step completes, and Genblaze automatically transfers the output into durable Backblaze B2 cloud storage at `b2://projectx-genblaze-media` using S3StorageBackend."* |
| **1:55 – 2:20** | Provenance Panel & Manifest Inspector | *"Here in the Provenance & Storage panel, we see full transparency: the exact Run ID, Provider, Model, byte-level SHA-256 hash, B2 key location, and Genblaze Manifest verification checkmark."* |
| **2:20 – 2:40** | History Drawer & Session Recall | *"Every experiment is recorded in Project X history. Creators can reopen past runs, inspect asset hashes, compare historical prompts, and reproduce experiments anytime."* |
| **2:40 – 2:55** | Architecture & Closing Summary | *"By pairing the Genblaze Python SDK with Backblaze B2, Project X brings durable storage, canonical manifests, and cryptographic trust to generative media workflows. Thank you!"* |
