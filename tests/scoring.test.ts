import { describe, it, expect } from 'vitest';
import { 
  scoreToStatus, 
  calculateCategoryScores, 
  calculateOverallFidelity, 
  extractCriticalFailures, 
  generateAnalysisSummary,
  CATEGORY_WEIGHTS
} from '../src/lib/scoringEngine';
import type { Cue } from '../src/types/script';

describe('Scoring Engine', () => {
  it('correctly maps scores to adherence status', () => {
    expect(scoreToStatus(95)).toBe('matched');
    expect(scoreToStatus(80)).toBe('matched');
    expect(scoreToStatus(79)).toBe('partial');
    expect(scoreToStatus(50)).toBe('partial');
    expect(scoreToStatus(49)).toBe('missed');
    expect(scoreToStatus(0)).toBe('missed');
  });

  it('weights core narrative categories higher than peripheral ones', () => {
    expect(CATEGORY_WEIGHTS.dialogue).toBeGreaterThan(CATEGORY_WEIGHTS.audio);
    expect(CATEGORY_WEIGHTS.action).toBeGreaterThan(CATEGORY_WEIGHTS.vfx);
    expect(CATEGORY_WEIGHTS.camera).toBe(1.0);
  });

  it('calculates category scores and cue counts accurately', () => {
    const mockCues: Cue[] = [
      {
        id: 'cue-1',
        type: 'dialogue',
        selectedText: 'Hello world',
        startTime: 0,
        endTime: 2,
        startIndex: 0,
        endIndex: 11,
        adherenceScore: 90,
      },
      {
        id: 'cue-2',
        type: 'dialogue',
        selectedText: 'Testing adherence',
        startTime: 2,
        endTime: 4,
        startIndex: 12,
        endIndex: 29,
        adherenceScore: 70,
      },
      {
        id: 'cue-3',
        type: 'action',
        selectedText: 'Actor walks across room',
        startTime: 4,
        endTime: 6,
        startIndex: 30,
        endIndex: 53,
        adherenceScore: 40,
        failureReason: 'Actor stayed seated',
      }
    ];

    const catScores = calculateCategoryScores(mockCues);
    expect(catScores.dialogue.count).toBe(2);
    expect(catScores.dialogue.score).toBe(80); // (90 + 70) / 2
    expect(catScores.dialogue.matched).toBe(1);
    expect(catScores.dialogue.partial).toBe(1);

    expect(catScores.action.count).toBe(1);
    expect(catScores.action.score).toBe(40);
    expect(catScores.action.missed).toBe(1);
  });

  it('calculates weighted overall fidelity score', () => {
    const mockCues: Cue[] = [
      {
        id: 'cue-1',
        type: 'dialogue', // weight 1.2
        selectedText: 'Dialogue beat',
        startTime: 0,
        endTime: 2,
        startIndex: 0,
        endIndex: 13,
        adherenceScore: 100,
      },
      {
        id: 'cue-2',
        type: 'audio', // weight 0.9
        selectedText: 'Audio beat',
        startTime: 2,
        endTime: 4,
        startIndex: 14,
        endIndex: 24,
        adherenceScore: 50,
      }
    ];

    const catScores = calculateCategoryScores(mockCues);
    const overall = calculateOverallFidelity(catScores, mockCues.length);
    // (100 * 1.2 + 50 * 0.9) / (1.2 + 0.9) = (120 + 45) / 2.1 = 165 / 2.1 = ~78.57 => 79
    expect(overall).toBe(79);
  });

  it('extracts critical failures with severity and suggested fixes', () => {
    const mockCues: Cue[] = [
      {
        id: 'cue-pass',
        type: 'dialogue',
        selectedText: 'Good line',
        startTime: 0,
        endTime: 2,
        startIndex: 0,
        endIndex: 9,
        adherenceScore: 95,
        status: 'matched',
      },
      {
        id: 'cue-fail',
        type: 'action',
        selectedText: 'Actor jumps from balcony',
        startTime: 5,
        endTime: 8,
        startIndex: 10,
        endIndex: 34,
        adherenceScore: 35,
        status: 'missed',
        failureReason: 'Actor remained motionless on ground',
        suggestedFix: 'Add dynamic motion keyframe and reduce physics damping',
      }
    ];

    const failures = extractCriticalFailures(mockCues);
    expect(failures).toHaveLength(1);
    expect(failures[0].cueId).toBe('cue-fail');
    expect(failures[0].score).toBe(35);
    expect(failures[0].suggestedFix).toContain('motion keyframe');
  });

  it('generates a full analysis summary with director notes', () => {
    const mockCues: Cue[] = [
      {
        id: 'cue-1',
        type: 'dialogue',
        selectedText: 'Line 1',
        startTime: 0,
        endTime: 2,
        startIndex: 0,
        endIndex: 6,
        adherenceScore: 90,
      }
    ];

    const summary = generateAnalysisSummary(mockCues);
    expect(summary.totalCuesAnalyzed).toBe(1);
    expect(summary.overallFidelityScore).toBe(90);
    expect(summary.matchedCues).toBe(1);
    expect(summary.directorNotes).toContain('High cinematic fidelity');
  });
});
