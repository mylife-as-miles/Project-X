import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { GeminiDirectorAgent } from '../server/gemini/directorAgent';

describe('Multimodal Video Ingestion & Validation', () => {
  const agent = new GeminiDirectorAgent();

  it('correctly resolves and attaches local video files to the agent pipeline', async () => {
    const videoPath = 'public/benchmark/mismatch_test.mp4';
    expect(fs.existsSync(path.resolve(videoPath))).toBe(true);

    const { staging, beats } = await agent.toolParseScript(`
      [<BRIEF>]
      [CAM 01] Forward camera dolly-in -> [ACT] Actor walks -> Actor says {Testing}
      [</BRIEF>]
    `);

    const result = await agent.toolAnalyzeVideo({
      scriptText: 'test',
      videoSource: videoPath,
      beats,
      staging,
    });

    expect(result.videoValidation).toBeDefined();
    expect(result.videoValidation.attached).toBe(true);
    expect(result.videoValidation.mimeType).toBe('video/mp4');
    expect(result.videoValidation.sourceType).toBe('inline_buffer');
    expect(result.videoValidation.sizeBytes).toBeGreaterThan(1000);
    expect(result.videoValidation.uri).toBeDefined();
  });

  it('rejects analysis gracefully when video asset cannot be resolved', async () => {
    const { staging, beats } = await agent.toolParseScript('[CAM 01] Shot');

    const result = await agent.toolAnalyzeVideo({
      scriptText: 'test',
      videoSource: '',
      beats,
      staging,
    });

    expect(result.videoValidation.attached).toBe(false);
    expect(result.videoValidation.sourceType).toBe('none');
    expect(result.videoValidation.error).toContain('No videoSource');
  });

  it('supports direct buffer input with explicit mimeType', async () => {
    const fakeBuffer = Buffer.from('fake mp4 video bytes for unit test validation');
    const { staging, beats } = await agent.toolParseScript('[CAM 01] Shot');

    const result = await agent.toolAnalyzeVideo({
      scriptText: 'test',
      videoSource: 'in-memory-stream.mp4',
      videoBuffer: fakeBuffer,
      videoMimeType: 'video/mp4',
      beats,
      staging,
    });

    expect(result.videoValidation.attached).toBe(true);
    expect(result.videoValidation.sourceType).toBe('inline_buffer');
    expect(result.videoValidation.sizeBytes).toBe(fakeBuffer.length);
  });

  it('REGRESSION TEST: strictly rejects YouTube URLs in live mode and NEVER substitutes benchmark video', async () => {
    // Arbitrary YouTube URLs must never be silently substituted with local benchmark video
    const testYouTubeUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/4J7K3y4Wp90',
      'dQw4w9WgXcQ',
    ];

    for (const url of testYouTubeUrls) {
      const validation = await agent.resolveVideoAsset(url, undefined, undefined, 'user_custom_scene', false);
      expect(validation.attached).toBe(false);
      expect(validation.sourceType).toBe('none');
      expect(validation.error).toContain('YouTube URLs and video IDs cannot be directly ingested');
      expect(validation.uri).toBeUndefined();
    }
  });

  it('supports Google Cloud Storage gs:// video URIs directly', async () => {
    const gcsUri = 'gs://project-x-analysis/renders/scene_01_v3.mp4';
    const validation = await agent.resolveVideoAsset(gcsUri);
    expect(validation.attached).toBe(true);
    expect(validation.sourceType).toBe('gcs_uri');
    expect(validation.uri).toBe(gcsUri);
    expect(validation.mimeType).toBe('video/mp4');
  });

  it('exposes genuine Google Cloud ADK Agent and registered tools', () => {
    expect(agent.adkAgent).toBeDefined();
    expect(agent.adkAgent.name).toBe('project_x_director_agent');
    expect(agent.parseScriptTool).toBeDefined();
    expect(agent.parseScriptTool.name).toBe('parse_script');
    expect(agent.analyzeVideoTool).toBeDefined();
    expect(agent.analyzeVideoTool.name).toBe('analyze_video');
    expect(agent.evaluateAdherenceTool).toBeDefined();
    expect(agent.evaluateAdherenceTool.name).toBe('evaluate_adherence');
    expect(agent.generateRegenerationPromptTool).toBeDefined();
    expect(agent.generateRegenerationPromptTool.name).toBe('generate_regeneration_prompt');
    expect(agent.persistAnalysisTool).toBeDefined();
    expect(agent.persistAnalysisTool.name).toBe('persist_analysis');
    expect(agent.queryGenerationHistoryTool).toBeDefined();
    expect(agent.queryGenerationHistoryTool.name).toBe('query_generation_history');
  });
});
