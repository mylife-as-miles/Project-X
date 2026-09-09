import { Router, Request, Response } from 'express';
import { GeminiDirectorAgent } from './gemini/directorAgent';
import { getSceneHistory, getClickHouseClient } from './db/clickhouse';
import { getGcsStorage } from './storage/gcs';

export const apiRouter = Router();
const directorAgent = new GeminiDirectorAgent();

apiRouter.get('/health', (req: Request, res: Response) => {
  const ch = getClickHouseClient();
  const gcs = getGcsStorage();
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  const isDemoMode = process.env.DEMO_MODE === 'true';

  res.json({
    status: 'ok',
    system: 'Project X — Agentic Script-to-Screen QA',
    agentStack: 'Google Gen AI Director Agent (ADK Tool Pattern) on Gemini 2.5',
    mode: isDemoMode ? 'demo' : 'live',
    runtime: {
      geminiMultimodal: hasGeminiKey ? 'Active (Live API)' : 'Unavailable (API Key Missing)',
      clickhouse: ch ? 'Connected (Cloud)' : 'Unavailable (Disconnected)',
      googleCloudStorage: gcs ? 'Connected (GCS)' : 'Unavailable (Local Dev Cache)',
    },
    timestamp: new Date().toISOString(),
  });
});

// Primary analysis execution endpoint: POST /api/analysis/run
apiRouter.post('/analysis/run', async (req: Request, res: Response) => {
  try {
    const { scriptText, videoSource, sceneId, generationNumber, videoProvider, videoModel } = req.body;

    if (!scriptText || typeof scriptText !== 'string') {
      res.status(400).json({ error: 'scriptText is required' });
      return;
    }

    const result = await directorAgent.runPipeline({
      scriptText,
      videoSource: videoSource || '',
      sceneId: sceneId || 'scene_frequency',
      generationNumber: typeof generationNumber === 'number' ? generationNumber : 3,
      videoProvider,
      videoModel,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[API /analysis/run] Error:', error);
    res.status(500).json({
      error: 'Failed to complete agentic analysis',
      message: error?.message || 'Unknown error',
    });
  }
});

// Targeted prompt fix endpoint: POST /api/analysis/regenerate-prompt
const handleRegeneratePrompt = async (req: Request, res: Response) => {
  try {
    const { cue, staging } = req.body;
    if (!cue) {
      res.status(400).json({ error: 'cue is required' });
      return;
    }

    const recs = await directorAgent.toolGenerateRegenerationPrompt(
      [cue],
      [{
        id: `fail-${cue.id}`,
        cueId: cue.id,
        title: cue.failureReason || 'Divergence from screenplay',
        timestamp: cue.startTime,
        type: cue.type || 'action',
        score: cue.adherenceScore || 40,
        expected: cue.expected || cue.selectedText,
        observed: cue.observed || '',
        reason: cue.failureReason || cue.explanation || 'Visual adherence threshold not met.',
      }],
      staging || {}
    );

    res.json({
      recommendation: recs[0] || null,
      provider: 'Google Gen AI Director Agent (Prompt Optimization Tool)',
    });
  } catch (error: any) {
    console.error('[API /analysis/regenerate-prompt] Error:', error);
    res.status(500).json({ error: 'Failed to generate prompt fix' });
  }
};

apiRouter.post('/analysis/regenerate-prompt', handleRegeneratePrompt);
apiRouter.post('/analysis/regenerate', handleRegeneratePrompt); // backward-compatible alias

// Generation history endpoints: GET /api/analysis/history/:projectId/:sceneId
const handleHistoryQuery = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId || (req.query.projectId as string) || 'project-x';
    const sceneId = req.params.sceneId || 'scene_frequency';
    const comparison = await getSceneHistory(projectId, sceneId);
    res.json(comparison);
  } catch (error: any) {
    console.error('[API /analysis/history] Error:', error);
    res.status(500).json({ error: 'Failed to fetch scene history' });
  }
};

apiRouter.get('/analysis/history/:projectId/:sceneId', handleHistoryQuery);
apiRouter.get('/analysis/history/:sceneId', handleHistoryQuery); // backward-compatible alias
apiRouter.get('/analysis/compare/:sceneId', handleHistoryQuery);
