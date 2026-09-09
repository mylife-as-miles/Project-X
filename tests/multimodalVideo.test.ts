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
});
