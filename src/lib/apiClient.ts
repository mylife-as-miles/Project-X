import { apiFetch } from './apiConfig';
import type { 
  Cue, 
  AnalysisSummary, 
  RegenerationRecommendation, 
  GenerationComparison,
  RuntimeSourceIndicators,
  VideoValidationInfo
} from '../types/script';
import { parseScriptToBeats } from './scriptBeatParser';
import { generateAnalysisSummary } from './scoringEngine';
import { CUE_COLOR_DEFINITIONS } from '../styles/tokens/cues';

export interface RunAnalysisResponse {
  runId: string;
  projectId: string;
  sceneId: string;
  generationNumber: number;
  videoSource: string;
  videoValidation?: VideoValidationInfo;
  cues: Cue[];
  summary: AnalysisSummary;
  recommendations: RegenerationRecommendation[];
  persistedToClickHouse: boolean;
  clickhouseMessage?: string;
  artifactUrl: string;
  artifactStorageProvider?: string;
  provider: string;
  agentStack?: string;
  runtimeSource?: RuntimeSourceIndicators;
}

export async function runAgenticAnalysis(params: {
  scriptText: string;
  videoSource: string;
  sceneId?: string;
  generationNumber?: number;
  videoProvider?: string;
  videoModel?: string;
  onProgress?: (stage: string, step: number, total: number) => void;
}): Promise<RunAnalysisResponse> {
  const updateProgress = params.onProgress || (() => {});

  updateProgress('Preparing screenplay and video context...', 1, 6);

  try {
    updateProgress('Transmitting to Google Gen AI Director Agent...', 2, 6);
    const response = await apiFetch('/api/analysis/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      updateProgress('Receiving multimodal video QA alignment...', 4, 6);
      const data: RunAnalysisResponse = await response.json();
      updateProgress('Persisting evaluation to ClickHouse & Cloud Storage...', 5, 6);
      updateProgress('Analysis complete.', 6, 6);
      return data;
    } else {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || errJson.error || `Server responded with ${response.status}`);
    }
  } catch (error: any) {
    console.warn('[apiClient] Server API error:', error);
    updateProgress('Live analysis error encountered.', 6, 6);

    // In LIVE mode, NEVER fabricate fake footage observations!
    // Return a truthful uncertain response detailing why live analysis could not complete.
    const beats = parseScriptToBeats(params.scriptText);
    const sceneId = params.sceneId || 'scene_frequency';
    const genNum = params.generationNumber || 3;

    const cues: Cue[] = beats.slice(0, 15).map((beat, i) => {
      const def = CUE_COLOR_DEFINITIONS.find(c => c.type.toLowerCase() === beat.type.toLowerCase());
      return {
        id: `cue-uncertain-${i + 1}`,
        type: beat.type,
        selectedText: beat.sourceText,
        startIndex: beat.startIndex,
        endIndex: beat.endIndex,
        startTime: i * 2.5,
        endTime: (i + 1) * 2.5,
        colorClass: def ? def.class : 'bg-slate-400/50',
        adherenceScore: 0,
        status: 'uncertain',
        expected: beat.sourceText,
        observed: 'Footage observation unavailable — Gemini multimodal analysis did not run.',
        explanation: error?.message || 'Server API unreachable or video analysis failed.',
        failureReason: error?.message || 'Server API unreachable',
        confidence: 0,
        severity: 'info',
        beatId: beat.id,
      };
    });

    const summary = generateAnalysisSummary(cues);
    summary.runtimeSource = {
      analysis: `Gemini analysis failed: ${error?.message || 'Server API unreachable'}`,
      clickhouse: 'ClickHouse unavailable',
      storage: 'Local development artifact',
      mode: 'live',
    };

    return {
      runId: `run-err-${Date.now()}`,
      projectId: 'project-x',
      sceneId,
      generationNumber: genNum,
      videoSource: params.videoSource,
      videoValidation: {
        attached: false,
        mimeType: 'none',
        sourceType: 'none',
        error: error?.message || 'API unreachable',
      },
      cues,
      summary,
      recommendations: [],
      persistedToClickHouse: false,
      artifactUrl: '',
      provider: `Gemini analysis failed (${error?.message || 'API unreachable'})`,
      runtimeSource: summary.runtimeSource,
    };
  }
}

export async function requestPromptFix(params: {
  cue: Cue;
  staging?: any;
}): Promise<RegenerationRecommendation | null> {
  const res = await apiFetch('/api/analysis/regenerate-prompt', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params),
  });
  return (await res.json()).recommendation;
}

export async function fetchSceneHistory(sceneId: string, projectId: string = 'project-x'): Promise<GenerationComparison> {
  let failure = 'ClickHouse unavailable';
  try {
    const res = await apiFetch(`/api/analysis/history/${encodeURIComponent(projectId)}/${encodeURIComponent(sceneId)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    failure = err instanceof Error ? err.message : 'API unreachable';
    console.warn('[apiClient] Fetch history error:', err);
  }

  // Truthful response when ClickHouse is not connected:
  return {
    projectId,
    sceneId,
    runs: [],
    improvements: [],
    regressions: [],
    narrative: `History unavailable — ${failure}`,
    connected: false,
  };
}
