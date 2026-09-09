import { vertexConfig } from './config';
import { Router, Request, Response } from 'express';
import { GeminiDirectorAgent } from './gemini/directorAgent';
import { getSceneHistory, getClickHouseClient } from './db/clickhouse';
import { getGcsStorage } from './storage/gcs';
import { version as adkVersion } from '@google/adk';

export const apiRouter = Router();
const directorAgent = new GeminiDirectorAgent();

apiRouter.get('/health', async (_req: Request, res: Response) => {
  const vertex = vertexConfig();
  const ch = getClickHouseClient();
  let clickhouse = 'disconnected';
  if (ch) {
    try { clickhouse = (await ch.ping()).success ? 'connected' : 'disconnected'; }
    catch { clickhouse = 'disconnected'; }
  }
  const gcs = process.env.GCS_BUCKET_NAME && getGcsStorage() ? 'configured' : 'unconfigured';
  res.json({
    status: 'ok', system: 'Project X',
    deployment: process.env.K_SERVICE ? 'Google Cloud Run' : 'Standalone Node API',
    framework: '@google/adk', adkVersion,
    agent: { name: 'project_x_director_agent', framework: '@google/adk', vertexAi: vertex.configured },
    agentStack: `Google ADK (@google/adk v${adkVersion}) with Gemini 2.5`,
    mode: process.env.DEMO_MODE === 'true' ? 'demo' : 'live',
    services: { vertexAi: vertex.configured ? 'configured' : 'unconfigured', clickhouse, gcs },
    timestamp: new Date().toISOString(),
  });
});

// Primary analysis execution endpoint: POST /api/analysis/run
apiRouter.post('/analysis/run', async (req: Request, res: Response) => {
  try {
    const { scriptText, videoSource, sceneId, generationNumber, videoProvider, videoModel } = req.body || {};

    if (typeof scriptText !== 'string' || !scriptText.trim() || scriptText.length > 200000) {
      res.status(400).json({ error: 'scriptText is required' });
      return;
    }

    if ((videoSource !== undefined && (typeof videoSource !== 'string' || videoSource.length > 8192)) ||
        (sceneId !== undefined && (typeof sceneId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(sceneId))) ||
        (generationNumber !== undefined && (!Number.isInteger(generationNumber) || generationNumber < 1 || generationNumber > 1000000)) ||
        [videoProvider, videoModel].some(value => value !== undefined && (typeof value !== 'string' || value.length > 128))) {
      res.status(400).json({ error: 'Invalid analysis payload. Use a video URL or gs:// URI, not inline base64.' });
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
      code: 'ANALYSIS_FAILED',
    });
  }
});

// Targeted prompt fix endpoint: POST /api/analysis/regenerate-prompt
const handleRegeneratePrompt = async (req: Request, res: Response) => {
  try {
    const { cue, staging } = req.body || {};
    if (!cue || typeof cue !== 'object' || Array.isArray(cue) || typeof cue.id !== 'string' ||
        typeof cue.selectedText !== 'string' || !Number.isFinite(cue.startTime) || !Number.isFinite(cue.endTime) ||
        (staging !== undefined && (typeof staging !== 'object' || staging === null || Array.isArray(staging)))) {
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
