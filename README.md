<div align="center">
  <img src="public/PROJECT_X_TAG_B.png" alt="Project X Logo" height="80">
  
  # Project X — Autonomous Script-to-Screen Quality Control for AI Filmmaking
  
  **An agentic AI director and quality-control system that autonomously evaluates AI video generations against screenplays, scores fidelity, diagnoses failures, tracks cross-generation progress, and generates surgical prompt fixes.**

  [![Agentic Cinema Hackathon](https://img.shields.io/badge/Agentic_Cinema-The_Blockbuster_Hackathon-amber?style=flat-square)](https://lablab.ai/event/agentic-cinema)
  [![Gemini 2.5](https://img.shields.io/badge/Gemini_2.5-Multimodal_Director_Agent-blue?style=flat-square&logo=google)](https://ai.google.dev/)
  [![ClickHouse Cloud](https://img.shields.io/badge/ClickHouse_Cloud-Production_Intelligence-orange?style=flat-square)](https://clickhouse.com/)
  [![Google Cloud Storage](https://img.shields.io/badge/Google_Cloud_Storage-Artifact_Persistence-4285F4?style=flat-square&logo=googlecloud)](https://cloud.google.com/storage)
  [![Tests](https://img.shields.io/badge/Tests-Vitest_100%25_Passing-brightgreen?style=flat-square)](https://vitest.dev/)
</div>

---

## 🎬 Core Product Promise

AI video generation is exploding, but professional AI filmmaking suffers from a massive bottleneck: **manual verification**. Creators generate tens or hundreds of video shots, then spend hours manually checking if characters performed the right actions, if props stayed consistent, if camera choreography respected the 180-degree axis, and if dialogue timing aligned with the screenplay.

**Project X transforms manual script-to-screen synchronization into a fully autonomous, agentic quality-control system.**

Give Project X a screenplay (traditional format or state-chained **Auteur Script**) and an AI-generated video (or YouTube / MP4 stream). The **Gemini Director Agent** autonomously:
1. **Understands Screenplay Intent & Staging** — Extracts staging rules (`[[INTENT]]`, `[[LOGIC]]`, `[[AESTHETIC]]`) and temporal beats.
2. **Inspects Video Multimodally** — Analyzes visual frames, timing, character orientation, props, camera movements, and audio cues.
3. **Aligns Script Beats to Screen Timestamps** — Automatically matches cues with millisecond precision without manual timestamping.
4. **Scores Script-to-Screen Fidelity** — Evaluates adherence across 8 weighted cinematic categories (Dialogue, Action, Camera, Shot, Audio, VFX, Transition, Environment).
5. **Pinpoints Critical Failures** — Detects physical blocking errors, lighting drift, missing props, and timing anomalies.
6. **Recommends Surgical Prompt Fixes** — Generates revised prompts with negative constraints and camera/action guardrails ready to paste into video generation models.
7. **Tracks Multi-Attempt Progression in ClickHouse** — Records every generation run (Attempt 1 → Attempt 2 → Attempt 3), displaying score deltas and category improvements over time.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Input["Screenplay & Video Input"]
        SP["Screenplay / Auteur Script\n[[INTENT]], [[LOGIC]], [[AESTHETIC]], [<BRIEF>]"]
        VD["AI Generated Video\n(YouTube / Local / MP4)"]
    end

    subgraph Agent["Gemini Director Agent (Orchestrator)"]
        GDA["GeminiDirectorAgent\n(@google/genai multimodal)"]
        T1["Tool: parse_script"]
        T2["Tool: analyze_video"]
        T3["Tool: evaluate_adherence"]
        T4["Tool: generate_regeneration_prompt"]
        
        GDA --> T1
        GDA --> T2
        GDA --> T3
        GDA --> T4
    end

    subgraph Evaluation["Evaluation & Scoring Engine"]
        SE["Deterministic Scoring Engine\nDialogue (1.2), Action (1.2), Camera (1.0)..."]
        CF["Critical Failure Detector\nSeverity, Observed vs Expected, Drift ms"]
        SE --> CF
    end

    subgraph Persistence["Cloud & Resilient Storage Layer"]
        CH[("ClickHouse Cloud\ngeneration_runs\ncue_analysis")]
        GCS[("Google Cloud Storage\nFull Run JSON Artifacts")]
        CACHE[("Resilient Intelligence Cache\nIn-Memory / Local Cache Fallback")]
    end

    subgraph Frontend["Project X UI Experience"]
        FD["Fidelity QA Dashboard\nOverall Fidelity % & 8-Category Breakdown"]
        TM["Timeline Cues Panel & Active Highlights\nEmerald (Matched), Amber (Partial), Rose (Missed)"]
        RM["Regeneration Modal\nRevised Prompts, Negative Constraints, Guardrails"]
        HM["Cross-Generation History Modal\nAttempt 1 → Attempt 2 → Attempt 3 Trends"]
    end

    Input --> Agent
    Agent --> Evaluation
    Evaluation --> Persistence
    Persistence --> Frontend
```

---

## 🚀 Agentic Cinema Hackathon Additions (Transparency Disclosure)

To maintain absolute transparency for hackathon judges, here is the clear breakdown of what was newly engineered for the **Agentic Cinema Hackathon** versus the inherited synchronization viewer foundation:

| Area | Hackathon Additions (NEW) | Inherited Project X Foundation (PRE-EXISTING) |
|---|---|---|
| **Autonomous Agent Layer** | **Gemini Director Agent** (`server/gemini/directorAgent.ts`, `server/api.ts`) with 4 registered tools (`parse_script`, `analyze_video`, `evaluate_adherence`, `generate_regeneration_prompt`). | Manual playback synchronization and manual text highlighting. |
| **Fidelity Scoring Engine** | **Deterministic Category Scoring Engine** (`src/lib/scoringEngine.ts`) with weighted cinematic categories, 0–100% script fidelity, and critical failure ranking. | Basic cue color categories without mathematical scoring or status metrics. |
| **Beat Parser** | **Screenplay Beat Extractor** (`src/lib/scriptBeatParser.ts`) that extracts `[[INTENT]]`, `[[LOGIC]]`, `[[AESTHETIC]]`, and `[<BRIEF>]` state-transition lines into structured evaluation beats. | Regex regex-based CSS highlight tokenization. |
| **Data Persistence** | **ClickHouse Cloud Schema & Client** (`server/db/clickhouse.ts`) storing `generation_runs` and `cue_analysis`, plus **Google Cloud Storage** (`server/storage/gcs.ts`) for run artifacts. | Browser `localStorage` only. |
| **Failure Diagnosis** | **Interactive Critical Failure Inspector** with 1-click timeline seeking, observed vs. expected diffs, and severity badges (`critical`, `warning`, `info`). | Flat list of cues without failure metadata or diagnostics. |
| **Prompt Regeneration** | **Targeted Prompt Fix Modal** (`src/components/RegenerationModal.tsx`) producing prompt revisions, negative constraints, camera adjustments, and continuity guardrails. | None. |
| **Cross-Gen Analytics** | **Cross-Gen History Modal** (`src/components/CrossGenHistoryModal.tsx`) tracking generation run progression (Attempt 1 → Attempt 2 → Attempt 3) with category deltas and narrative. | None. |
| **Visual Indicators** | Real-time **status pills** on cues (Matched = Emerald, Partial = Amber, Missed = Rose, Uncertain = Slate) and **Fidelity Score Badge** on header. | Generic category color classes only. |
| **Benchmark Fixture & Tests** | Pre-evaluated benchmark scene (`public/examples/demo_frequency_qa.json`) and **10 passing automated tests** in Vitest (`tests/`). | No automated test framework. |

---

## 🌟 Key Features

### 1. Autonomous Gemini Director Agent
- Analyzes screenplay staging directives (`[[INTENT]]`, `[[LOGIC]]`, `[[AESTHETIC]]`, `[[OPENING]]`) alongside video frames.
- Aligns micro-action beats and dialogue lines to video timecodes with sub-second accuracy.
- Evaluates visual adherence with explicit reasoning and confidence scores (0.00–1.00).

### 2. Weighted Cinematic Fidelity Scoring
Different cinematic dimensions carry distinct storytelling weight:
- **Dialogue** (Weight: 1.2) — Speech delivery, character cadence, script matching.
- **Action / Blocking** (Weight: 1.2) — Character motion, physical interactions, prop handling.
- **Camera Movement** (Weight: 1.0) — Framing (EWS, MCU, CU), tracking speed, 180° axis adherence.
- **Shot Composition** (Weight: 1.0) — Aspect framing and compositional balance.
- **Audio & SFX** (Weight: 0.9) — Foley sync, environmental ambiance, sound envelope.
- **VFX** (Weight: 0.9) — Visual effect timing and particle realism.
- **Environment & Lighting** (Weight: 0.9) — Color temperature (e.g. tungsten vs. fluorescent), textures, atmosphere.
- **Transitions** (Weight: 0.9) — Match-on-action cuts and scene boundary pacing.

### 3. Critical Failure Diagnosis & 1-Click Jump
- Identifies divergences where visual adherence falls below acceptable thresholds (< 60%).
- Categorizes failures by severity (`critical`, `warning`, `info`).
- Clicking any failure instantly jumps the video player and screenplay auto-scroll directly to the exact millisecond of the failure.

### 4. Surgical Prompt Fix & Regeneration
- Generates tailored regeneration prompt updates for failed cues:
  - **Revised Staging Directive**: Surgical prompt replacement snippet.
  - **Camera Corrections**: Exact lens and axis framing adjustments.
  - **Action Corrections**: Physical blocking instructions.
  - **Negative Constraints**: Explicit negative prompts (e.g. `(delayed prop interaction:1.3)`, `(cool white light:1.5)`).
  - **Continuity Guardrails**: Cross-shot consistency constraints.
- One-click copy button for rapid iteration in Midjourney, Kling, Dreamina, Veo, or Runway.

### 5. Cross-Generation Progression in ClickHouse
- Stores historical runs per project and scene in ClickHouse Cloud.
- Displays multi-attempt trajectory: **Attempt 1 (61%) → Attempt 2 (78%) → Attempt 3 (88%)**.
- Highlights category-by-category score progressions and Gemini director summary notes.

### 6. Dual-Mode Resilient Architecture
- **Online Cloud Mode**: Leverages live `@google/genai` Multimodal API, ClickHouse Cloud, and Google Cloud Storage.
- **Resilient Fallback Mode**: If cloud services or keys are offline, Project X seamlessly falls back to its deterministic director engine in-memory, ensuring hackathon judges and offline reviewers experience zero crashes and full functionality.

---

## 🛠️ Quickstart & Local Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Clone & Install
```bash
git clone https://github.com/mylife-as-miles/Project-X.git
cd Project-X
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` or create a `.env` file in the root directory:
```env
# Google Gemini Multimodal API Key (for live Gemini Director calls)
GEMINI_API_KEY=your_gemini_api_key_here

# ClickHouse Cloud Connection (for persistent generation run tracking)
CLICKHOUSE_HOST=https://your-clickhouse-host.clickhouse.cloud:8443
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_clickhouse_password
CLICKHOUSE_DATABASE=default

# Google Cloud Storage (for run artifact persistence)
GCS_BUCKET_NAME=project-x-analysis-artifacts
```
> **Note**: Project X features a resilient dual-mode architecture. If credentials are omitted, the application runs in local intelligence mode with full QA evaluation, benchmark comparisons, and regeneration modal features enabled out of the box!

### 3. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser. The Vite server automatically mounts the Express `/api` middleware.

### 4. Run Automated Tests
```bash
npm test
```
Executes all Vitest test suites verifying scoring logic, beat parsing, and ClickHouse mapping.

### 5. Production Build
```bash
npm run build
```

---

## 🧪 Benchmark Demo Scene: "Frequency Over Force"

For immediate evaluation, Project X loads a pre-evaluated benchmark scene: **⚡ Frequency Over Force (Agentic QA Evaluated)**:
- **Screenplay**: Academic drama written in Auteur Script format with full `[[INTENT]]`, `[[LOGIC]]`, `[[AESTHETIC]]`, and `[<BRIEF>]` state chaining.
- **Video Source**: Multi-shot academic film with metronome demonstration.
- **QA Metrics**: 108 evaluated cues, 88% overall script fidelity.
- **Diagnosed Divergences**:
  - `cue-032` (Critical): Lighting temperature deviation (cool wash instead of tungsten amber).
  - `cue-017` (Warning): Prop timing drift on wooden casing thumb contact (+0.6s).
  - `cue-024` (Warning): Stage axis drift during character approach.

Click **"Script Fidelity: 88%"** in the header or **"Analyze with Gemini"** to test the system!

---

## 📄 License & Attribution

Licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

Developed for **Agentic Cinema: The Blockbuster Hackathon** (2026).
