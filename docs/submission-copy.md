# Project X — Devpost Submission Copy

## Project Title
**Project X — The Provenance-First Generative Media Lab**

## Tagline
*An end-to-end generative media workspace powering prompt engineering, multi-modal reference analysis, Genblaze pipeline orchestration, and Backblaze B2 durable storage with cryptographic provenance.*

---

## Inspiration
As AI media models evolve rapidly across image, video, and audio generation, creators and engineering teams face a critical gap: generative media outputs are often ephemeral, untracked, and disconnected from the exact prompts, parameters, and reference assets that created them. We built **Project X** to bridge this gap—providing a provenance-first workspace where prompt engineering meets verifiable execution and durable cloud object storage.

---

## What It Does
Project X lets creators:
1. **Design & Iterate Prompt Templates**: Create reusable prompt templates with dynamic `{{ variable }}` placeholders that generate form fields automatically.
2. **Attach Multimodal References**: Upload visual reference images (`@imageN`) and video clips (`@videoN`) to ground generation requests.
3. **Execute Real Genblaze Pipelines**: Run media generation through the official `genblaze-core` Python SDK (`Modality.IMAGE`), supporting providers like Google and OpenAI.
4. **Store Assets in Backblaze B2**: Automatically persist generated outputs into Backblaze B2 cloud storage via `ObjectStorageSink` and `S3StorageBackend.for_backblaze(...)`.
5. **Verify Cryptographic Provenance**: Compute byte-level SHA-256 asset hashes and generate canonical Genblaze Provenance Manifests (`$schema: https://genblaze.org/schemas/v1/manifest.json`).
6. **Inspect & Reproduce Experiments**: Review full run history with exact Run IDs, model parameters, B2 keys, and SHA-256 verification badges.

---

## How We Built It
- **Frontend Workspace**: Built with Next.js 15+, Tailwind CSS v4, and Lucide React.
- **AI Infrastructure Backend**: A dedicated FastAPI Python 3.12 microservice (`services/genblaze-api/`) running `genblaze-core`, `genblaze-s3`, `genblaze-google`, and `genblaze-openai`.
- **Cloud Object Storage**: S3-compatible Backblaze B2 integration (`b2://projectx-genblaze-media`) for durable, long-term asset and manifest persistence.
- **Security & Truthfulness**: All credentials (`B2_KEY_ID`, `B2_APPLICATION_KEY`, API keys) remain strictly server-side. Unconfigured states or provider failures return honest HTTP error status codes (400, 422, 502, 500) without fake URLs or mock fallbacks.

---

## How Backblaze B2 is Used
Backblaze B2 serves as the primary object storage layer for Project X. The `genblaze-s3` package (`S3StorageBackend.for_backblaze(...)`) transfers generated media assets, project configuration metadata, and canonical provenance manifests directly into B2 buckets organized hierarchically by project ID and run ID.

---

## How Genblaze is Used
Project X uses the `genblaze-core` Python SDK to construct `Pipeline` workflows (`Modality.IMAGE`), execute model steps, extract asset metadata, calculate SHA-256 hashes, and verify manifest canonical hashes (`Manifest.verify()`).

---

## Accomplishments
- Implemented a complete end-to-end media generation pipeline using the real Genblaze Python SDK.
- Connected Backblaze B2 S3-compatible cloud storage for asset and manifest persistence.
- Built a collapsible Provenance & Storage panel providing full cryptographic transparency.
- Established a robust Python unit test suite (`pytest`) and FastAPI service architecture.
