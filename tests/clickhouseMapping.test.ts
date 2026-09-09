import { describe, it, expect } from 'vitest';
import { getSceneHistory, persistAnalysisToClickHouse } from '../server/db/clickhouse';
import type { AnalysisSummary, Cue } from '../src/types/script';

describe('ClickHouse Schema & Intelligence Cache', () => {
  it('stores and retrieves generation run history with progression', async () => {
    const projectId = 'test-proj-' + Date.now();
    const sceneId = 'test-scene';

    const mockSummary1: AnalysisSummary = {
      overallFidelityScore: 68,
      totalCuesAnalyzed: 5,
      matchedCues: 3,
      partialCues: 1,
      missedCues: 1,
      uncertainCues: 0,
      categoryScores: {
        dialogue: { category: 'dialogue', score: 70, count: 5, matched: 3, partial: 1, missed: 1, uncertain: 0 }
      },
      criticalFailures: [
        {
          id: 'fail-1',
          cueId: 'cue-1',
          title: 'Action mismatch',
          timestamp: 5.0,
          type: 'action',
          score: 40,
          expected: 'Door opens',
          observed: 'Door stays shut',
          reason: 'Mechanical failure'
        }
      ],
      directorNotes: 'Initial generation with action divergence.'
    };

    const mockCues1: Cue[] = [
      {
        id: 'cue-1',
        type: 'action',
        selectedText: 'Door opens',
        startTime: 0,
        endTime: 3,
        startIndex: 0,
        endIndex: 10,
        adherenceScore: 40,
        status: 'missed'
      }
    ];

    // Persist Attempt 1
    const res1 = await persistAnalysisToClickHouse({
      runId: 'run-1',
      projectId,
      sceneId,
      generationNumber: 1,
      videoId: 'vid-1',
      summary: mockSummary1,
      cues: mockCues1
    });

    expect(res1).toBeDefined();

    const mockSummary2: AnalysisSummary = {
      ...mockSummary1,
      overallFidelityScore: 84,
      criticalFailures: [],
      categoryScores: {
        dialogue: { category: 'dialogue', score: 85, count: 5, matched: 4, partial: 1, missed: 0, uncertain: 0 }
      }
    };

    // Persist Attempt 2
    const res2 = await persistAnalysisToClickHouse({
      runId: 'run-2',
      projectId,
      sceneId,
      generationNumber: 2,
      videoId: 'vid-1',
      summary: mockSummary2,
      cues: mockCues1
    });

    expect(res2).toBeDefined();

    const history = await getSceneHistory(projectId, sceneId);
    expect(history.sceneId).toBe(sceneId);
    expect(history.runs.length).toBe(2);
    expect(history.runs[0].generationNumber).toBe(1);
    expect(history.runs[1].generationNumber).toBe(2);
    
    const delta = history.runs[1].overallScore - history.runs[0].overallScore;
    expect(delta).toBe(16); // 84 - 68
    expect(history.improvements.length).toBeGreaterThanOrEqual(1);
    expect(history.narrative).toContain('84%');
  });
});
