import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { apiRouter } from '../server/api';

describe('Production API Endpoints', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 3000;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('responds to GET /api/health with system metadata', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.system).toContain('Project X');
    expect(data.framework).toBe('@google/adk');
    expect(data.adkVersion).toBe('2.0.0');
    expect(data.agentStack).toContain('@google/adk');
  });

  it('supports POST /api/analysis/run with scriptText validation', async () => {
    const resNoScript = await fetch(`${baseUrl}/api/analysis/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(resNoScript.status).toBe(400);

    const res = await fetch(`${baseUrl}/api/analysis/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptText: 'INT. LAB - DAY\n[CAM 01] Wide shot\nMark says {Eureka}',
        videoSource: 'public/benchmark/mismatch_test.mp4',
        sceneId: 'scene_test',
        generationNumber: 1,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.runId).toBeDefined();
    expect(data.cues).toBeInstanceOf(Array);
    expect(data.summary).toBeDefined();
    expect(data.videoValidation).toBeDefined();
    expect(data.runtimeSource).toBeDefined();
  });

  it('supports POST /api/analysis/regenerate-prompt', async () => {
    const res = await fetch(`${baseUrl}/api/analysis/regenerate-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cue: {
          id: 'cue-fail-1',
          type: 'camera',
          selectedText: 'Camera dollies forward',
          startTime: 2.0,
          endTime: 4.5,
          adherenceScore: 35,
          failureReason: 'Camera stayed completely static',
        },
        staging: { logic: 'Strict 180 axis' },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.recommendation).toBeDefined();
    expect(data.recommendation.revisedPrompt.toLowerCase()).toContain('camera');
    expect(data.recommendation.negativeConstraints).toBeInstanceOf(Array);
  });

  it('supports GET /api/analysis/history/:projectId/:sceneId', async () => {
    const res = await fetch(`${baseUrl}/api/analysis/history/project-x/scene_test_routes`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.projectId).toBe('project-x');
    expect(data.sceneId).toBe('scene_test_routes');
    expect(data.runs).toBeInstanceOf(Array);
  });

  it('verifies Vercel serverless catch-all handler preserves API subpaths', async () => {
    const vercelApp = (await import('../api/index')).default;
    expect(vercelApp).toBeDefined();

    const vercelServer = vercelApp.listen(0);
    const vercelPort = (vercelServer.address() as any).port;
    const vUrl = `http://localhost:${vercelPort}`;

    try {
      // Test both preserved /api/health and stripped /health paths
      const resWithApi = await fetch(`${vUrl}/api/health`);
      expect(resWithApi.status).toBe(200);
      const dataWithApi = await resWithApi.json();
      expect(dataWithApi.framework).toBe('@google/adk');

      const resStripped = await fetch(`${vUrl}/health`);
      expect(resStripped.status).toBe(200);
      const dataStripped = await resStripped.json();
      expect(dataStripped.framework).toBe('@google/adk');

      const resHistory = await fetch(`${vUrl}/api/analysis/history/project-x/scene_vercel`);
      expect(resHistory.status).toBe(200);
      const dataHistory = await resHistory.json();
      expect(dataHistory.sceneId).toBe('scene_vercel');
    } finally {
      await new Promise<void>((resolve) => vercelServer.close(() => resolve()));
    }
  });
});
