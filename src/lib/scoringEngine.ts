import type { 
  Cue, 
  CueStatus, 
  CueCategoryType, 
  FidelityCategoryScore, 
  CriticalFailure, 
  AnalysisSummary 
} from '../types/script';

export const CATEGORY_WEIGHTS: Record<CueCategoryType, number> = {
  dialogue: 1.2,
  action: 1.2,
  camera: 1.0,
  shot: 1.0,
  audio: 0.9,
  vfx: 0.9,
  environment: 0.9,
  transition: 0.9,
};

export function scoreToStatus(score: number): CueStatus {
  if (score >= 80) return 'matched';
  if (score >= 50) return 'partial';
  if (score >= 0) return 'missed';
  return 'uncertain';
}

export function calculateCategoryScores(cues: Cue[]): Record<string, FidelityCategoryScore> {
  const categories: CueCategoryType[] = [
    'dialogue',
    'action',
    'camera',
    'shot',
    'audio',
    'vfx',
    'transition',
    'environment',
  ];

  const result: Record<string, FidelityCategoryScore> = {};

  for (const cat of categories) {
    result[cat] = {
      category: cat,
      score: 100,
      count: 0,
      matched: 0,
      partial: 0,
      missed: 0,
      uncertain: 0,
    };
  }

  const scoresByCat: Record<string, number[]> = {};
  for (const cat of categories) {
    scoresByCat[cat] = [];
  }

  for (const cue of cues) {
    const rawType = (cue.type || 'action').toLowerCase() as CueCategoryType;
    const cat = categories.includes(rawType) ? rawType : 'action';

    const score = typeof cue.adherenceScore === 'number' ? Math.max(0, Math.min(100, cue.adherenceScore)) : 80;
    const status = cue.status || scoreToStatus(score);

    scoresByCat[cat].push(score);
    result[cat].count += 1;

    if (status === 'matched') result[cat].matched += 1;
    else if (status === 'partial') result[cat].partial += 1;
    else if (status === 'missed') result[cat].missed += 1;
    else result[cat].uncertain += 1;
  }

  for (const cat of categories) {
    const list = scoresByCat[cat];
    if (list.length > 0) {
      const avg = list.reduce((a, b) => a + b, 0) / list.length;
      result[cat].score = Math.round(avg);
    } else {
      result[cat].score = 100;
    }
  }

  return result;
}

export function calculateOverallFidelity(
  categoryScores: Record<string, FidelityCategoryScore>,
  totalCues: number
): number {
  if (totalCues === 0) return 100;

  let weightedSum = 0;
  let weightSum = 0;

  for (const [cat, data] of Object.entries(categoryScores)) {
    if (data.count > 0) {
      const weight = CATEGORY_WEIGHTS[cat as CueCategoryType] || 1.0;
      weightedSum += data.score * weight;
      weightSum += weight;
    }
  }

  if (weightSum === 0) return 100;
  return Math.round(weightedSum / weightSum);
}

export function extractCriticalFailures(cues: Cue[]): CriticalFailure[] {
  const failures: CriticalFailure[] = [];

  const failedCues = cues.filter(
    (c) => (typeof c.adherenceScore === 'number' && c.adherenceScore < 60) || c.status === 'missed' || c.status === 'partial'
  );

  failedCues.sort((a, b) => (a.adherenceScore ?? 50) - (b.adherenceScore ?? 50));

  for (const cue of failedCues) {
    const score = cue.adherenceScore ?? 30;
    const title = cue.failureReason 
      ? cue.failureReason.split('.')[0] 
      : `${(cue.type || 'Beat').toUpperCase()} failure: "${cue.selectedText.slice(0, 45)}..."`;

    failures.push({
      id: `fail-${cue.id}`,
      cueId: cue.id,
      title,
      timestamp: cue.startTime,
      type: cue.type || 'action',
      score,
      expected: cue.expected || cue.selectedText,
      observed: cue.observed || 'Action or instruction did not materialize on screen',
      reason: cue.failureReason || cue.explanation || 'Visual adherence threshold not met.',
      suggestedFix: cue.suggestedFix,
    });
  }

  return failures;
}

export function generateAnalysisSummary(cues: Cue[]): AnalysisSummary {
  const categoryScores = calculateCategoryScores(cues);
  const overallFidelityScore = calculateOverallFidelity(categoryScores, cues.length);
  const criticalFailures = extractCriticalFailures(cues);

  let matchedCues = 0;
  let partialCues = 0;
  let missedCues = 0;
  let uncertainCues = 0;

  for (const c of cues) {
    const status = c.status || scoreToStatus(c.adherenceScore ?? 80);
    if (status === 'matched') matchedCues++;
    else if (status === 'partial') partialCues++;
    else if (status === 'missed') missedCues++;
    else uncertainCues++;
  }

  return {
    overallFidelityScore,
    totalCuesAnalyzed: cues.length,
    matchedCues,
    partialCues,
    missedCues,
    uncertainCues,
    categoryScores,
    criticalFailures,
    directorNotes: overallFidelityScore >= 85 
      ? 'High cinematic fidelity. Minor secondary micro-actions can be polished via targeted regeneration.' 
      : 'Significant cinematic divergence detected in physical blocking and camera choreography. Recommended prompt regeneration for failed beats.',
  };
}
