import { GoogleGenAI } from '@google/genai';
import { Agent, FunctionTool, Gemini, version as adkVersion } from '@google/adk';
import fs from 'fs';
import path from 'path';
import type { 
  Cue, 
  ScriptBeat, 
  AnalysisSummary, 
  RegenerationRecommendation,
  CueStatus,
  CriticalFailure,
  GenerationComparison
} from '../../src/types/script';
import { parseScriptToBeats, extractStagingContext, StagingContext } from '../../src/lib/scriptBeatParser';
import { generateAnalysisSummary } from '../../src/lib/scoringEngine';
import { CUE_COLOR_DEFINITIONS } from '../../src/styles/tokens/cues';
import { persistAnalysisToClickHouse, getSceneHistory } from '../db/clickhouse';
import { uploadArtifactToGcs, GcsUploadResult } from '../storage/gcs';

export interface VideoValidationResult {
  attached: boolean;
  mimeType: string;
  sourceType: 'inline_buffer' | 'files_api' | 'gcs_uri' | 'none';
  sizeBytes?: number;
  uri?: string;
  error?: string;
}

export interface DirectorAgentRunResult {
  runId: string;
  projectId: string;
  sceneId: string;
  generationNumber: number;
  videoSource: string;
  videoValidation: VideoValidationResult;
  cues: Cue[];
  summary: AnalysisSummary;
  recommendations: RegenerationRecommendation[];
  persistedToClickHouse: boolean;
  clickhouseMessage?: string;
  artifactUrl: string;
  artifactStorageProvider: string;
  provider: string;
  agentStack: string;
  adkVersion: string;
  framework: string;
  runtimeSource: {
    analysis: string;
    clickhouse: string;
    storage: string;
    mode: 'live' | 'demo';
  };
}

export class GeminiDirectorAgent {
  private ai: GoogleGenAI | null = null;
  private geminiLlm: Gemini | null = null;
  private hasApiKey: boolean = false;
  private useVertexAi: boolean = false;
  private vertexProjectId: string = '';
  private vertexLocation: string = 'us-central1';

  // Genuine Google Cloud ADK Agent and Tools
  public adkAgent: Agent;
  public parseScriptTool: FunctionTool<any>;
  public analyzeVideoTool: FunctionTool<any>;
  public evaluateAdherenceTool: FunctionTool<any>;
  public generateRegenerationPromptTool: FunctionTool<any>;
  public persistAnalysisTool: FunctionTool<any>;
  public queryGenerationHistoryTool: FunctionTool<any>;

  constructor() {
    const gcpProject = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCS_PROJECT_ID;
    const gcpLocation = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    const apiKey = process.env.GEMINI_API_KEY;

    // Prefer Vertex AI for Google Cloud production hackathon mode
    if (gcpProject || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.useVertexAi = true;
      this.vertexProjectId = gcpProject || 'project-x-cloud';
      this.vertexLocation = gcpLocation;
      try {
        this.ai = new GoogleGenAI({
          vertexai: true,
          project: this.vertexProjectId,
          location: this.vertexLocation,
        });
        this.geminiLlm = new Gemini({
          model: 'gemini-2.5-flash',
          vertexai: true,
          project: this.vertexProjectId,
          location: this.vertexLocation,
        });
        this.hasApiKey = true;
      } catch (err) {
        console.warn('[GeminiDirectorAgent] Vertex AI initialization warning:', err);
      }
    } else if (apiKey && apiKey !== 'demo' && apiKey.length > 5) {
      // Local Developer Mode using Gemini API Key
      try {
        this.ai = new GoogleGenAI({ apiKey });
        this.geminiLlm = new Gemini({
          model: 'gemini-2.5-flash',
          apiKey,
        });
        this.hasApiKey = true;
      } catch (err) {
        console.warn('[GeminiDirectorAgent] GoogleGenAI init notice:', err);
      }
    }

    // 1. Tool: parse_script
    this.parseScriptTool = new FunctionTool({
      name: 'parse_script',
      description: 'Extracts screenplay staging context (intent, logic, aesthetic, opening) and structured chronological beats.',
      execute: async (args: any) => this.toolParseScript(args.scriptText),
    });

    // 2. Tool: analyze_video
    this.analyzeVideoTool = new FunctionTool({
      name: 'analyze_video',
      description: 'Attaches video footage Part to Gemini on Vertex AI and performs multimodal frame-by-frame inspection.',
      execute: async (args: any) => this.toolAnalyzeVideo(args),
    });

    // 3. Tool: evaluate_adherence
    this.evaluateAdherenceTool = new FunctionTool({
      name: 'evaluate_adherence',
      description: 'Computes 8-category weighted cinematic adherence scores and status alignment.',
      execute: async (args: any) => this.toolEvaluateAdherence(args),
    });

    // 4. Tool: generate_regeneration_prompt
    this.generateRegenerationPromptTool = new FunctionTool({
      name: 'generate_regeneration_prompt',
      description: 'Constructs surgical prompt fixes, camera/rig corrections, and negative constraints for failed beats.',
      execute: async (args: any) => this.toolGenerateRegenerationPrompt(args.cues, args.criticalFailures, args.staging),
    });

    // 5. Tool: persist_analysis
    this.persistAnalysisTool = new FunctionTool({
      name: 'persist_analysis',
      description: 'Persists structured analytical run records to ClickHouse Cloud and Google Cloud Storage.',
      execute: async (args: any) => this.toolPersistAnalysis(args),
    });

    // 6. Tool: query_generation_history
    this.queryGenerationHistoryTool = new FunctionTool({
      name: 'query_generation_history',
      description: 'Queries historical generation runs to detect progression or regressions across attempts.',
      execute: async (args: any) => this.toolQueryGenerationHistory(args.projectId, args.sceneId),
    });

    // Primary ADK Agent Orchestration Layer
    this.adkAgent = new Agent({
      name: 'project_x_director_agent',
      description: 'Autonomous Script-to-Screen Director Agent built with Google Cloud ADK for multimodal video evaluation and prompt repair.',
      model: this.geminiLlm || 'gemini-2.5-flash',
      instruction: 'You are the Project X autonomous Director Agent. Analyze screenplays against video footage, identify cinematic discrepancies across 8 dimensions, score adherence, and generate prompt repairs.',
      tools: [
        this.parseScriptTool,
        this.analyzeVideoTool,
        this.evaluateAdherenceTool,
        this.generateRegenerationPromptTool,
        this.persistAnalysisTool,
        this.queryGenerationHistoryTool,
      ],
    });
  }

  /**
   * Primary Autonomous Pipeline orchestrating the 6 Google Cloud Agent tools through ADK runtime:
   * 1. parse_script
   * 2. analyze_video
   * 3. evaluate_adherence
   * 4. generate_regeneration_prompt
   * 5. persist_analysis
   * 6. query_generation_history
   */
  async runPipeline(params: {
    scriptText: string;
    videoSource: string;
    videoBuffer?: Buffer;
    videoMimeType?: string;
    sceneId?: string;
    generationNumber?: number;
    videoProvider?: string;
    videoModel?: string;
    onProgress?: (stage: string, step: number, total: number) => void;
  }): Promise<DirectorAgentRunResult> {
    const isDemoMode = process.env.DEMO_MODE === 'true';
    const sceneId = params.sceneId || 'scene_frequency';
    const generationNumber = params.generationNumber || 3;
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const updateProgress = params.onProgress || (() => {});

    // Tool 1: parse_script via ADK Tool Runtime
    updateProgress('ADK Tool [parse_script]: Extracting Auteur staging and screenplay beats...', 1, 6);
    const { staging, beats } = (await this.parseScriptTool.runAsync({
      args: { scriptText: params.scriptText },
      toolContext: {} as any,
    })) as { staging: StagingContext; beats: ScriptBeat[] };

    // Tool 2: analyze_video via ADK Tool Runtime (Multimodal inspection with real attached video Part)
    updateProgress('ADK Tool [analyze_video]: Resolving video asset and inspecting frames with Gemini...', 2, 6);
    const { videoValidation, observations, rawError } = (await this.analyzeVideoTool.runAsync({
      args: {
        scriptText: params.scriptText,
        videoSource: params.videoSource,
        videoBuffer: params.videoBuffer,
        videoMimeType: params.videoMimeType,
        sceneId,
        beats,
        staging,
      },
      toolContext: {} as any,
    })) as { videoValidation: VideoValidationResult; observations: any[]; rawError?: string };

    // Tool 3: evaluate_adherence via ADK Tool Runtime
    updateProgress('ADK Tool [evaluate_adherence]: Evaluating screenplay beat adherence and scoring...', 3, 6);
    const generatedCues = (await this.evaluateAdherenceTool.runAsync({
      args: {
        beats,
        observations,
        staging,
        videoValidation,
        rawError,
        isDemoMode,
        scriptText: params.scriptText,
      },
      toolContext: {} as any,
    })) as Cue[];

    const summary = generateAnalysisSummary(generatedCues);

    // Tool 4: generate_regeneration_prompt via ADK Tool Runtime
    updateProgress('ADK Tool [generate_regeneration_prompt]: Constructing surgical prompt fixes...', 4, 6);
    const recommendations = (await this.generateRegenerationPromptTool.runAsync({
      args: {
        cues: generatedCues,
        criticalFailures: summary.criticalFailures,
        staging,
      },
      toolContext: {} as any,
    })) as RegenerationRecommendation[];

    // Tool 5: persist_analysis via ADK Tool Runtime (ClickHouse & GCS)
    updateProgress('ADK Tool [persist_analysis]: Storing run artifact in GCS and indexing in ClickHouse...', 5, 6);
    const artifactPayload = JSON.stringify({
      runId,
      sceneId,
      generationNumber,
      summary,
      cues: generatedCues,
      recommendations,
      videoValidation,
      agentStack: `Google Cloud Agent Development Kit (@google/adk v${adkVersion}) with Gemini 2.5 on ${this.useVertexAi ? 'Vertex AI' : 'Google GenAI'}`,
      framework: '@google/adk',
      adkVersion,
      timestamp: new Date().toISOString(),
    }, null, 2);

    const gcsResult: GcsUploadResult = await uploadArtifactToGcs(
      `analysis/${sceneId}/run_${generationNumber}_${Date.now()}.json`,
      artifactPayload,
      'application/json'
    );

    const clickhouseResult = (await this.persistAnalysisTool.runAsync({
      args: {
        runId,
        projectId: 'project-x',
        sceneId,
        generationNumber,
        videoId: params.videoSource || 'local-asset',
        videoProvider: params.videoProvider,
        videoModel: params.videoModel,
        summary,
        cues: generatedCues,
      },
      toolContext: {} as any,
    })) as any;

    const clickhouseSuccess = Boolean(
      clickhouseResult && (clickhouseResult === true || clickhouseResult.success === true)
    );

    // Tool 6: query_generation_history via ADK Tool Runtime
    updateProgress('ADK Tool [query_generation_history]: Verifying multi-attempt intelligence trajectory...', 6, 6);
    let clickhouseMessage: string | undefined;
    try {
      const history = (await this.queryGenerationHistoryTool.runAsync({
        args: { projectId: 'project-x', sceneId },
        toolContext: {} as any,
      })) as GenerationComparison;
      if (!history.connected) {
        clickhouseMessage = 'ClickHouse Cloud is disconnected — run was cached in local intelligence state.';
      }
    } catch {
      clickhouseMessage = 'ClickHouse Cloud is offline.';
    }

    const agentStackDescription = `Google Cloud Agent Development Kit (@google/adk v${adkVersion}) with Gemini 2.5 on ${this.useVertexAi ? 'Vertex AI' : (this.hasApiKey ? 'Google GenAI' : 'Vertex AI (Disconnected)')}`;

    let analysisSourceDescription = 'Google ADK Director Agent (Gemini 2.5 on Vertex AI)';
    if (isDemoMode) {
      analysisSourceDescription = 'Demo fixture / precomputed benchmark';
    } else if (this.useVertexAi) {
      analysisSourceDescription = `Google ADK (@google/adk v${adkVersion}) — Vertex AI (${this.vertexProjectId} / ${this.vertexLocation})`;
    } else if (this.hasApiKey) {
      analysisSourceDescription = `Google ADK (@google/adk v${adkVersion}) — Gemini Developer API (Local Dev Key)`;
    } else {
      analysisSourceDescription = `Google ADK (@google/adk v${adkVersion}) — Vertex AI / Gemini credentials unconfigured on server`;
    }

    const storageSourceDescription = gcsResult.persistedToGcs
      ? `Google Cloud Storage (gs://${process.env.GCS_BUCKET_NAME || 'project-x-analysis'})`
      : 'Local development storage (Dev cache)';

    const clickhouseSourceDescription = clickhouseSuccess
      ? 'ClickHouse Cloud (Connected & Synchronized)'
      : 'ClickHouse Cloud (Disconnected)';

    return {
      runId,
      projectId: 'project-x',
      sceneId,
      generationNumber,
      videoSource: params.videoSource,
      videoValidation,
      cues: generatedCues,
      summary,
      recommendations,
      persistedToClickHouse: clickhouseSuccess,
      clickhouseMessage,
      artifactUrl: gcsResult.url,
      artifactStorageProvider: gcsResult.provider,
      provider: analysisSourceDescription,
      agentStack: agentStackDescription,
      adkVersion,
      framework: '@google/adk',
      runtimeSource: {
        analysis: analysisSourceDescription,
        clickhouse: clickhouseSourceDescription,
        storage: storageSourceDescription,
        mode: isDemoMode ? 'demo' : 'live',
      },
    };
  }

  // ==========================================
  // AGENT TOOL 1: parse_script
  // ==========================================
  async toolParseScript(scriptText: string): Promise<{ staging: StagingContext; beats: ScriptBeat[] }> {
    const staging = extractStagingContext(scriptText);
    const beats = parseScriptToBeats(scriptText);
    return { staging, beats };
  }

  // ==========================================
  // AGENT TOOL 2: analyze_video (MULTIMODAL)
  // ==========================================
  async toolAnalyzeVideo(params: {
    scriptText: string;
    videoSource: string;
    videoBuffer?: Buffer;
    videoMimeType?: string;
    sceneId?: string;
    beats: ScriptBeat[];
    staging: StagingContext;
  }): Promise<{ videoValidation: VideoValidationResult; observations: any[]; rawError?: string }> {
    const isDemoMode = process.env.DEMO_MODE === 'true';

    // 1. Resolve and attach the real video asset
    const videoAsset = await this.resolveVideoAsset(
      params.videoSource, 
      params.videoBuffer, 
      params.videoMimeType,
      params.sceneId,
      isDemoMode
    );

    if (!videoAsset.attached) {
      return {
        videoValidation: videoAsset,
        observations: [],
        rawError: videoAsset.error || 'Video asset could not be attached for multimodal inspection',
      };
    }

    // 2. If no Gemini API or Vertex AI is configured or in DEMO mode
    if (!this.hasApiKey || !this.ai) {
      if (isDemoMode) {
        return {
          videoValidation: videoAsset,
          observations: [], // will load demo fixture in evaluateAdherence
        };
      }
      return {
        videoValidation: videoAsset,
        observations: [],
        rawError: 'Google Cloud Vertex AI credentials or GEMINI_API_KEY are not configured on the server. Multimodal video analysis requires Vertex AI ADC or Gemini API key.',
      };
    }

    // 3. Construct genuine multimodal request with attached video Part
    try {
      const beatsSubset = params.beats.slice(0, 20);
      const promptInstructions = `You are the lead director AI for Project X cinematic quality control.
Inspect the attached video asset against the provided screenplay beats.
Analyze the video frames carefully for:
1. Camera framing, motion (e.g. dolly-in, pan, tilt, static lockoff), and lens choices.
2. Character physical blocking, action execution, and prop permanence.
3. Audio/dialogue cadence and foley synchronization.
4. Lighting temperature, environment, and aesthetic fidelity.

Screenplay Staging Context:
Intent: ${params.staging.intent || 'Not specified'}
Logic: ${params.staging.logic || 'Not specified'}
Aesthetic: ${params.staging.aesthetic || 'Not specified'}

Expected Screenplay Beats to verify in video:
${JSON.stringify(beatsSubset.map(b => ({
  id: b.id,
  type: b.type,
  text: b.sourceText,
  expectedCamera: b.expectedCamera,
  expectedAction: b.expectedAction,
  expectedDialogue: b.expectedDialogue,
  expectedAudio: b.expectedAudio,
})), null, 2)}

Return a JSON array of timestamp-grounded observations. Each element MUST be:
{
  "beatId": "string matching beat ID",
  "timeStart": number (approximate seconds in video, e.g. 1.5),
  "timeEnd": number (approximate seconds in video, e.g. 4.0),
  "visualObservation": "Detailed factual description of what actually happens in the video footage",
  "cameraObservation": "Observed camera behavior (e.g. static wide, handheld push, etc.)",
  "actionObservation": "Observed actor or subject physical movements",
  "audioObservation": "Observed sound or dialogue sync",
  "adherenceStatus": "matched" | "partial" | "missed" | "uncertain",
  "adherenceScore": number (0 to 100),
  "discrepancyNote": "Explanation of any divergence from screenplay directive (or empty if matched)",
  "suggestedPromptFix": "Prompt correction snippet if divergence detected"
}
`;

      // Build content parts with video asset attached
      const contentParts: any[] = [{ text: promptInstructions }];

      if (videoAsset.sourceType === 'inline_buffer' && videoAsset.uri) {
        contentParts.push({
          inlineData: {
            mimeType: videoAsset.mimeType,
            data: videoAsset.uri,
          },
        });
      } else if (videoAsset.sourceType === 'gcs_uri' && videoAsset.uri) {
        contentParts.push({
          fileData: {
            fileUri: videoAsset.uri,
            mimeType: videoAsset.mimeType,
          },
        });
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contentParts,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text || '';
      let observations: any[] = [];
      try {
        observations = JSON.parse(responseText);
        if (!Array.isArray(observations)) {
          if (observations && Array.isArray((observations as any).observations)) {
            observations = (observations as any).observations;
          } else {
            observations = [];
          }
        }
      } catch (parseErr) {
        console.warn('[GeminiDirectorAgent] JSON parse warning on multimodal response:', parseErr);
        // Extract array from markdown code fence if present
        const arrayMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          observations = JSON.parse(arrayMatch[0]);
        }
      }

      return {
        videoValidation: videoAsset,
        observations,
      };
    } catch (err: any) {
      console.error('[GeminiDirectorAgent] Real Gemini multimodal call error:', err?.message || err);
      return {
        videoValidation: videoAsset,
        observations: [],
        rawError: err?.message || 'Gemini video analysis model execution error',
      };
    }
  }

  // ==========================================
  // AGENT TOOL 3: evaluate_adherence
  // ==========================================
  async toolEvaluateAdherence(params: {
    beats: ScriptBeat[];
    observations: any[];
    staging: StagingContext;
    videoValidation: VideoValidationResult;
    rawError?: string;
    isDemoMode: boolean;
    scriptText: string;
  }): Promise<Cue[]> {
    const { beats, observations, rawError, isDemoMode, scriptText } = params;

    // DEMO MODE: load deterministic precomputed benchmark fixture
    if (isDemoMode) {
      return this.loadDemoFixtureCues(scriptText);
    }

    // LIVE MODE:
    // If real observations came back from Gemini, align them to cues
    if (observations.length > 0) {
      return observations.map((obs, idx) => {
        const matchingBeat = beats.find(b => b.id === obs.beatId) || beats[idx];
        const cueType = matchingBeat?.type || 'action';
        const startTime = typeof obs.timeStart === 'number' ? Number(obs.timeStart.toFixed(1)) : idx * 2.5;
        const endTime = typeof obs.timeEnd === 'number' ? Number(obs.timeEnd.toFixed(1)) : startTime + 2.5;
        const score = typeof obs.adherenceScore === 'number' ? Math.max(0, Math.min(100, obs.adherenceScore)) : 80;
        const status: CueStatus = obs.adherenceStatus || (score >= 80 ? 'matched' : (score >= 50 ? 'partial' : 'missed'));

        return {
          id: `cue-gemini-${idx + 1}`,
          type: cueType,
          selectedText: matchingBeat?.sourceText || `Beat ${idx + 1}`,
          startIndex: matchingBeat?.startIndex || 0,
          endIndex: matchingBeat?.endIndex || 0,
          startTime,
          endTime,
          colorClass: this.getColorClassForType(cueType),
          speaker: matchingBeat?.type === 'dialogue' && matchingBeat.sourceText.includes(':') 
            ? matchingBeat.sourceText.split(':')[0] 
            : null,
          adherenceScore: score,
          status,
          expected: matchingBeat?.sourceText || 'Screenplay instruction',
          observed: obs.visualObservation || obs.cameraObservation || obs.actionObservation || 'No visual observation recorded.',
          explanation: obs.discrepancyNote || 'Evaluated against video footage.',
          failureReason: score < 70 ? (obs.discrepancyNote || 'Visual divergence detected from screenplay directive.') : undefined,
          confidence: 0.92,
          severity: score < 50 ? 'critical' : (score < 80 ? 'warning' : 'info'),
          suggestedFix: obs.suggestedPromptFix,
          beatId: matchingBeat?.id,
        };
      });
    }

    // LIVE MODE FAILURE:
    // If Gemini analysis failed or video was unattached, NEVER fabricate observed footage!
    // Truthfully return uncertain cues indicating the exact failure reason.
    const failureExplanation = rawError || 'Multimodal video analysis could not be completed.';

    return beats.slice(0, 15).map((beat, i) => ({
      id: `cue-uncertain-${i + 1}`,
      type: beat.type,
      selectedText: beat.sourceText,
      startIndex: beat.startIndex,
      endIndex: beat.endIndex,
      startTime: i * 2.5,
      endTime: (i + 1) * 2.5,
      colorClass: this.getColorClassForType(beat.type),
      speaker: beat.type === 'dialogue' && beat.sourceText.includes(':') 
        ? beat.sourceText.split(':')[0] 
        : null,
      adherenceScore: 0,
      status: 'uncertain',
      expected: beat.sourceText,
      observed: 'Footage observation unavailable — Gemini multimodal analysis did not return visual observations for this beat.',
      explanation: failureExplanation,
      failureReason: failureExplanation,
      confidence: 0.0,
      severity: 'info',
      beatId: beat.id,
    }));
  }

  // ==========================================
  // AGENT TOOL 4: generate_regeneration_prompt
  // ==========================================
  async toolGenerateRegenerationPrompt(
    cues: Cue[],
    criticalFailures: CriticalFailure[],
    staging: StagingContext
  ): Promise<RegenerationRecommendation[]> {
    const recommendations: RegenerationRecommendation[] = [];

    for (const failure of criticalFailures.slice(0, 5)) {
      const cue = cues.find(c => c.id === failure.cueId) || {
        id: failure.cueId,
        type: failure.type,
        expected: failure.expected,
        observed: failure.observed,
        failureReason: failure.reason,
      };

      // If live Gemini is active, use prompt engineering
      if (this.hasApiKey && this.ai) {
        try {
          const prompt = `You are an expert AI video generation prompt engineer.
A video generation failed to follow the screenplay instruction:
Screenplay Beat: "${cue.expected}"
Observed in video: "${cue.observed}"
Failure Reason: "${cue.failureReason || failure.reason}"
Staging Intent: "${staging.intent || 'Cinematic continuity'}"
Staging Logic: "${staging.logic || 'Physical permanence'}"

Generate a targeted revised prompt snippet and strict negative constraints to eliminate this visual error on re-render.
Return JSON:
{
  "revisedPrompt": "Precise cinematic prompt sentence describing the exact action and framing",
  "cameraCorrections": "Explicit camera move instructions (e.g. dolly-in, 50mm lens, level horizon)",
  "actionCorrections": "Actor blocking and physical contact timing instruction",
  "audioVfxCorrections": "Audio or lighting correction instruction",
  "negativeConstraints": ["list", "of", "negative", "prompt", "tokens"]
}`;

          const res = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json', temperature: 0.2 },
          });

          const parsed = JSON.parse(res.text || '{}');
          recommendations.push({
            cueId: cue.id,
            problem: cue.failureReason || failure.reason,
            revisedPrompt: parsed.revisedPrompt || `Targeted correction for ${cue.expected}`,
            guardrails: [
              `Enforce ${staging.logic || 'physical continuity'}`,
              `Preserve axis of action relative to center staging`,
            ],
            continuityRequirements: staging.logic || 'Strict spatial and physical continuity across cuts.',
            cameraCorrections: parsed.cameraCorrections || 'Maintain steady framing without floating pan.',
            actionCorrections: parsed.actionCorrections || 'Actor decisively completes physical action on cadence.',
            audioVfxCorrections: parsed.audioVfxCorrections || 'Acoustics aligned with room geometry.',
            negativeConstraints: parsed.negativeConstraints || ['floating camera', 'limp hands', 'rubber physics'],
          });
          continue;
        } catch (promptErr) {
          console.warn('[GeminiDirectorAgent] LLM prompt fix error, generating structured fallback:', promptErr);
        }
      }

      // High-quality structured fallback recommendation
      const negativeConstraints: string[] = [];
      if (cue.type === 'camera') {
        negativeConstraints.push('static camera, digital crop, floating camera roll, morphing background');
      } else if (cue.type === 'action') {
        negativeConstraints.push('limp hands, stationary posture, paper disappearance, rubbery physics');
      } else {
        negativeConstraints.push('delay, asynchronous audio, jitter, audio desync');
      }

      recommendations.push({
        cueId: cue.id,
        problem: cue.failureReason || failure.reason,
        revisedPrompt: cue.type === 'camera'
          ? `Physical camera move: Medium shot of character. The camera physically dollies forward 1.5 meters along floor track over 2.5 seconds, settling into a tight medium close-up. Keep horizon level.`
          : cue.type === 'action'
          ? `Physical interaction: Subject stage-left holds manuscript in right hand. On dialogue cadence, subject snaps paper firmly downward against trouser leg with visible physical contact and fabric resistance.`
          : `Macro focus on desk surface. Wooden metronome and brass pendulum click at exact 0.5s cadence. Lighting matches overhead tungsten grid.`,
        guardrails: [
          'Preserve object permanence for the manuscript.',
          'Grounded match-on-action contact frames.',
        ],
        continuityRequirements: staging.logic || 'Strict camera continuity across cuts.',
        cameraCorrections: cue.type === 'camera' ? 'Physical track movement only; no digital zoom.' : 'Framing must encompass waist to mid-thigh to capture tactile paper contact.',
        actionCorrections: cue.type === 'action' ? 'Decisive downward physical contact of paper against thigh.' : 'Synchronized mechanical release.',
        audioVfxCorrections: cue.type === 'audio' ? 'Sync mechanical click with physical impact frame.' : 'Standard hall acoustics.',
        negativeConstraints,
      });
    }

    return recommendations;
  }

  // ==========================================
  // AGENT TOOL 5: persist_analysis
  // ==========================================
  async toolPersistAnalysis(params: {
    runId: string;
    projectId: string;
    sceneId: string;
    generationNumber: number;
    videoId: string;
    videoProvider?: string;
    videoModel?: string;
    summary: AnalysisSummary;
    cues: Cue[];
  }) {
    return persistAnalysisToClickHouse(params);
  }

  // ==========================================
  // AGENT TOOL 6: query_generation_history
  // ==========================================
  async toolQueryGenerationHistory(projectId: string, sceneId: string): Promise<GenerationComparison> {
    return getSceneHistory(projectId, sceneId);
  }

  // ==========================================
  // Video Asset Resolver (Real Video Ingestion)
  // ==========================================
  public async resolveVideoAsset(
    videoSource: string, 
    videoBuffer?: Buffer, 
    videoMimeType?: string,
    sceneId?: string,
    isDemoMode: boolean = false
  ): Promise<VideoValidationResult> {
    const mimeType = videoMimeType || 'video/mp4';

    // 1. Direct Buffer provided
    if (videoBuffer && videoBuffer.length > 0) {
      const base64Data = videoBuffer.toString('base64');
      return {
        attached: true,
        mimeType,
        sourceType: 'inline_buffer',
        sizeBytes: videoBuffer.length,
        uri: base64Data,
      };
    }

    if (!videoSource || typeof videoSource !== 'string' || videoSource.trim().length === 0) {
      return {
        attached: false,
        mimeType,
        sourceType: 'none',
        error: 'No videoSource or videoBuffer was provided in request.',
      };
    }

    const trimmed = videoSource.trim();

    // 2. Base64 Data URL (e.g. data:video/mp4;base64,AAAA...)
    if (trimmed.startsWith('data:video/')) {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx !== -1) {
        const header = trimmed.slice(0, commaIdx);
        const base64Data = trimmed.slice(commaIdx + 1);
        const detectedMime = header.split(';')[0].replace('data:', '') || mimeType;
        const sizeBytes = Buffer.from(base64Data, 'base64').length;
        return {
          attached: true,
          mimeType: detectedMime,
          sourceType: 'inline_buffer',
          sizeBytes,
          uri: base64Data,
        };
      }
    }

    // 3. Google Cloud Storage URI (e.g. gs://bucket/path.mp4)
    if (trimmed.startsWith('gs://')) {
      return {
        attached: true,
        mimeType,
        sourceType: 'gcs_uri',
        uri: trimmed,
      };
    }

    // 4. Local File Path (e.g. public/benchmark/mismatch_test.mp4)
    try {
      const potentialPaths = [
        trimmed,
        path.resolve(trimmed),
        path.resolve('public', trimmed.replace(/^\/+|public[\\/]/, '')),
        path.resolve('public/benchmark', path.basename(trimmed)),
      ];

      for (const p of potentialPaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          const buffer = fs.readFileSync(p);
          const base64Data = buffer.toString('base64');
          return {
            attached: true,
            mimeType,
            sourceType: 'inline_buffer',
            sizeBytes: buffer.length,
            uri: base64Data,
          };
        }
      }
    } catch (err) {
      console.warn('[GeminiDirectorAgent] Local file lookup error:', err);
    }

    // 5. Check if this is a YouTube URL or 11-character YouTube video ID
    const isYouTubeUrl = trimmed.includes('youtube.com') || trimmed.includes('youtu.be');
    const isYouTubeId = /^[a-zA-Z0-9_-]{11}$/.test(trimmed) && !trimmed.includes('.') && !trimmed.includes('/');

    if (isYouTubeUrl || isYouTubeId) {
      // In DEMO_MODE, benchmark video is permitted ONLY if the user explicitly selected the benchmark/demo scene
      if (isDemoMode && (sceneId === 'scene_mismatch_benchmark' || sceneId === 'scene_frequency')) {
        const benchmarkPath = path.resolve('public/benchmark/mismatch_test.mp4');
        if (fs.existsSync(benchmarkPath)) {
          const buffer = fs.readFileSync(benchmarkPath);
          return {
            attached: true,
            mimeType: 'video/mp4',
            sourceType: 'inline_buffer',
            sizeBytes: buffer.length,
            uri: buffer.toString('base64'),
          };
        }
      }

      // LIVE MODE: YouTube cannot be directly analyzed as raw multimodal frames by Gemini.
      // NEVER silently substitute another video. Return truthful unsupported-source explanation.
      return {
        attached: false,
        mimeType: 'none',
        sourceType: 'none',
        error: 'YouTube URLs and video IDs cannot be directly ingested as raw video frames by Gemini. Please upload an MP4 video file, provide a direct downloadable video URL (.mp4), or provide a Google Cloud Storage URI (gs://bucket/video.mp4).',
      };
    }

    // 6. Direct HTTP/HTTPS Video URL (fetches the video bytes into buffer)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const isDirectVideoUrl = trimmed.endsWith('.mp4') || trimmed.endsWith('.webm') || trimmed.includes('/video/');
      if (isDirectVideoUrl) {
        try {
          const res = await fetch(trimmed);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = res.headers.get('content-type') || mimeType;
            return {
              attached: true,
              mimeType: contentType,
              sourceType: 'inline_buffer',
              sizeBytes: buffer.length,
              uri: buffer.toString('base64'),
            };
          }
        } catch (fetchErr) {
          console.warn('[GeminiDirectorAgent] Failed to fetch direct video URL:', fetchErr);
        }
      }
    }

    return {
      attached: false,
      mimeType: 'none',
      sourceType: 'none',
      error: `Video source "${videoSource}" could not be resolved to a local file, direct MP4 URL, or gs:// URI.`,
    };
  }

  // ==========================================
  // Demo Fixture Loader (DEMO MODE ONLY)
  // ==========================================
  private loadDemoFixtureCues(scriptText: string): Cue[] {
    const demoFixturePath = path.resolve('public/examples/demo_frequency_qa.json');
    if (fs.existsSync(demoFixturePath)) {
      try {
        const raw = fs.readFileSync(demoFixturePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.cues) && parsed.cues.length > 0) {
          return parsed.cues;
        }
      } catch (err) {
        console.warn('[GeminiDirectorAgent] Failed to parse demo fixture:', err);
      }
    }

    // Minimal deterministic fallback
    const beats = parseScriptToBeats(scriptText);
    return beats.slice(0, 10).map((b, i) => ({
      id: `cue-demo-${i + 1}`,
      type: b.type,
      selectedText: b.sourceText,
      startIndex: b.startIndex,
      endIndex: b.endIndex,
      startTime: i * 3.0,
      endTime: (i + 1) * 3.0,
      colorClass: this.getColorClassForType(b.type),
      adherenceScore: 85,
      status: 'matched' as CueStatus,
      expected: b.sourceText,
      observed: `[Demo Fixture] Verified adherence for ${b.sourceText.slice(0, 30)}...`,
      confidence: 0.9,
      severity: 'info',
      beatId: b.id,
    }));
  }

  private getColorClassForType(type: string): string {
    const def = CUE_COLOR_DEFINITIONS.find(c => c.type.toLowerCase() === type.toLowerCase());
    return def ? def.class : 'bg-slate-400/50';
  }
}
