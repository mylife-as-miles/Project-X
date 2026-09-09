export type CueStatus = 'matched' | 'partial' | 'missed' | 'uncertain';

export type CueCategoryType = 
  | 'dialogue'
  | 'action'
  | 'camera'
  | 'shot'
  | 'audio'
  | 'vfx'
  | 'transition'
  | 'environment';

export interface ScriptBeat {
  id: string;
  type: CueCategoryType;
  sourceText: string;
  startIndex: number;
  endIndex: number;
  expectedCamera?: string;
  expectedAction?: string;
  expectedDialogue?: string;
  expectedAudio?: string;
  expectedVfx?: string;
  expectedEnvironment?: string;
  continuityProtocol?: string;
  relativeOrder: number;
}

export interface VideoObservation {
  timestamp: number;
  visualSummary: string;
  detectedSubject?: string;
  cameraMovement?: string;
  shotType?: string;
  observedAction?: string;
  observedAudio?: string;
  lightingEnvironment?: string;
  confidence: number;
}

export interface AnalysisCue {
  id: string;
  beatId?: string;
  type: CueCategoryType;
  selectedText: string;
  startTime: number;
  endTime: number;
  adherenceScore: number;
  status: CueStatus;
  expected: string;
  observed: string;
  explanation: string;
  failureReason?: string;
  confidence: number;
  severity?: 'critical' | 'warning' | 'info';
  suggestedFix?: string;
}

export interface FidelityCategoryScore {
  category: CueCategoryType;
  score: number;
  count: number;
  matched: number;
  partial: number;
  missed: number;
  uncertain: number;
}

export interface CriticalFailure {
  id: string;
  cueId: string;
  title: string;
  timestamp: number;
  type: string;
  score: number;
  expected: string;
  observed: string;
  reason: string;
  suggestedFix?: string;
}

export interface RuntimeSourceIndicators {
  analysis: string;
  clickhouse: string;
  storage: string;
  mode: 'live' | 'demo';
}

export interface VideoValidationInfo {
  attached: boolean;
  mimeType: string;
  sourceType: string;
  sizeBytes?: number;
  uri?: string;
  error?: string;
}

export interface AnalysisSummary {
  overallFidelityScore: number; // 0-100
  totalCuesAnalyzed: number;
  matchedCues: number;
  partialCues: number;
  missedCues: number;
  uncertainCues: number;
  categoryScores: Record<string, FidelityCategoryScore>;
  criticalFailures: CriticalFailure[];
  directorNotes?: string;
  runtimeSource?: RuntimeSourceIndicators;
  videoValidation?: VideoValidationInfo;
}

export interface RegenerationRecommendation {
  cueId: string;
  problem: string;
  revisedPrompt: string;
  guardrails: string[];
  continuityRequirements: string;
  cameraCorrections: string;
  actionCorrections: string;
  audioVfxCorrections: string;
  negativeConstraints?: string[];
}

export interface AnalysisRun {
  id: string;
  projectId: string;
  sceneId: string;
  generationNumber: number;
  videoSource: string;
  summary: AnalysisSummary;
  cues: AnalysisCue[];
  createdAt: string;
  storageArtifactUrl?: string;
  persistedToClickHouse: boolean;
}

export interface GenerationComparison {
  projectId: string;
  sceneId: string;
  runs: {
    generationNumber: number;
    overallScore: number;
    createdAt: string;
    categoryScores: Record<string, number>;
  }[];
  improvements: string[];
  regressions: string[];
  narrative: string;
  connected?: boolean;
  error?: string;
}

export interface AnalysisPipelineProgress {
  stage: 
    | 'idle' 
    | 'preparing_script' 
    | 'analyzing_script' 
    | 'analyzing_video' 
    | 'aligning_timeline' 
    | 'scoring_adherence' 
    | 'persisting_clickhouse' 
    | 'generating_recommendations' 
    | 'complete' 
    | 'error';
  message: string;
  step: number;
  totalSteps: number;
  error?: string;
}
