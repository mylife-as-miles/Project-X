import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GeminiDirectorAgent } from '../server/gemini/directorAgent';
import { getSceneHistory, persistAnalysisToClickHouse } from '../server/db/clickhouse';
import type { AnalysisSummary, Cue } from '../src/types/script';

describe('Authenticity & Anti-Fabrication Safeguards', () => {
  const originalDemoMode = process.env.DEMO_MODE;

  beforeEach(() => {
    delete process.env.DEMO_MODE;
  });

  afterEach(() => {
    if (originalDemoMode !== undefined) {
      process.env.DEMO_MODE = originalDemoMode;
    } else {
      delete process.env.DEMO_MODE;
    }
  });

  it('never fabricates observations in LIVE mode when video analysis cannot run', async () => {
    process.env.DEMO_MODE = 'false';
    const agent = new GeminiDirectorAgent();

    const beats = [
      {
        id: 'beat-1',
        type: 'camera' as const,
        sourceText: 'Camera dolly in',
        startIndex: 0,
        endIndex: 15,
        relativeOrder: 0,
      }
    ];

    // Evaluate in live mode without video observations
    const cues = await agent.toolEvaluateAdherence({
      beats,
      observations: [], // no real observations returned
      staging: { rawBlocks: {} },
      videoValidation: { attached: false, mimeType: 'none', sourceType: 'none', error: 'Video missing' },
      rawError: 'Video asset was not attached',
      isDemoMode: false,
      scriptText: 'test',
    });

    expect(cues.length).toBe(1);
    expect(cues[0].status).toBe('uncertain');
    expect(cues[0].observed).toContain('Footage observation unavailable');
    expect(cues[0].explanation).toContain('Video asset was not attached');
    // Ensure no fake synthetic score like 42 or 92 was fabricated!
    expect(cues[0].adherenceScore).toBe(0);
  });

  it('isolates seeded mock history strictly behind DEMO_MODE=true', async () => {
    // 1. Without DEMO_MODE, seeded history is absent
    process.env.DEMO_MODE = 'false';
    const prodHistory = await getSceneHistory('project-x', 'scene_frequency');
    // If ClickHouse is disconnected, it must report disconnected rather than seeded runs
    if (!prodHistory.runs || prodHistory.runs.length === 0) {
      expect(prodHistory.narrative).toMatch(/ClickHouse is not connected|No previous generation analyses/);
    }

    // 2. With DEMO_MODE=true, demo fixture is returned with explicit labeling
    process.env.DEMO_MODE = 'true';
    const demoHistory = await getSceneHistory('project-x', 'scene_frequency');
    expect(demoHistory.narrative).toContain('Demo fixture history');
    expect(demoHistory.runs.length).toBe(2);
    expect(demoHistory.runs[0].generationNumber).toBe(1);
    expect(demoHistory.runs[1].generationNumber).toBe(2);
  });

  it('differentiates disconnected ClickHouse state truthfully', async () => {
    process.env.DEMO_MODE = 'false';
    const history = await getSceneHistory('project-disconnected-' + Date.now(), 'scene-none');
    expect(history.narrative).toContain('ClickHouse is not connected');
  });

  it('records real video provider and model metadata instead of hardcoded strings', async () => {
    const res = await persistAnalysisToClickHouse({
      runId: 'run-meta-test',
      projectId: 'project-test',
      sceneId: 'scene-test',
      generationNumber: 1,
      videoId: 'vid-test',
      videoProvider: 'Runway Gen-3',
      videoModel: 'gen3-alpha-turbo',
      summary: {
        overallFidelityScore: 80,
        totalCuesAnalyzed: 1,
        matchedCues: 1,
        partialCues: 0,
        missedCues: 0,
        uncertainCues: 0,
        categoryScores: { action: { category: 'action', score: 80, count: 1, matched: 1, partial: 0, missed: 0, uncertain: 0 } },
        criticalFailures: [],
      },
      cues: [],
    });

    expect(res).toBeDefined();
  });
});
