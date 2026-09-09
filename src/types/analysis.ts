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

export interface AnalysisCue {
  id: string;
  type: string;
  selectedText: string;
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  colorClass?: string;
  speaker?: string | null;

  // QA & Evaluation Metadata
  adherenceScore?: number; // 0-100
  status?: CueStatus;
  expected?: string;
  observed?: string;
  explanation?: string;
  failureReason?: string;
  confidence?: number;
  severity?: 'critical' | 'warning' | 'info';
  suggestedFix?: string;
  beatId?: string;
}

export interface ScriptBeat {
  id: string;
  type: CueCategoryType;
  sourceText: string;
  startIndex: number;
  endIndex: number;
  expectedAction?: string;
  expectedDialogue?: string;
  expectedCamera?: string;
  expectedShot?: string;
  expectedAudio?: string;
  expectedVfx?: string;
  expectedEnvironment?: string;
  continuityProtocol?: string;
  relativeOrder: number;
}

export interface VideoObservation {
  timestampStart: number;
  timestampEnd: number;
  charactersVisible: string[];
  actionsObserved: string;
  framingAndShot: string;
  cameraMotion: string;
  environmentAndLighting: string;
  audioEvents: string;
  vfxObserved: string;
  confidence: number;
}

export interface FidelityCategoryScore {
  category: CueCategoryType;
  score: number; // 0-100
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
