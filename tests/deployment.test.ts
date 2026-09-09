import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, allowedOrigins } from '../server/app';
import { vertexConfig } from '../server/config';
import { normalizeApiBase, apiFetch } from '../src/lib/apiConfig';
import { GeminiDirectorAgent } from '../server/gemini/directorAgent';
import { uploadArtifactToGcs } from '../server/storage/gcs';
import { fetchVideo } from '../server/media';
import type { Server } from 'node:http';

let server: Server | undefined;
afterEach(async () => {
  vi.unstubAllEnvs(); vi.unstubAllGlobals();
  if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); server = undefined; }
});
async function start() {
  const app = createApp({ NODE_ENV: 'production', CHATGPT_SITE_ORIGIN: 'https://project.chatgpt.site' });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server!.once('listening', resolve));
  return `http://127.0.0.1:${(server.address() as any).port}`;
}

describe('Cloud Run deployment contract', () => {
  it('normalizes the public API origin and requires it in production', () => {
    expect(normalizeApiBase(' https://api.run.app/// ', true)).toBe('https://api.run.app');
    expect(normalizeApiBase()).toBe('');
    expect(() => normalizeApiBase('', true)).toThrow('not configured');
    for (const value of ['https://api.run.app/api', 'https://user:pass@api.run.app', 'http://api.run.app']) {
      expect(() => normalizeApiBase(value, true)).toThrow();
    }
  });
  it('sends requests to the configured backend and explains opaque network/CORS failures', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.run.app/');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await apiFetch('/api/health');
    expect(fetchMock).toHaveBeenCalledWith('https://api.run.app/api/health', undefined);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiFetch('/api/health')).rejects.toThrow('API unreachable or CORS');
  });
  it('allows the final Sites origin and its JSON preflight', async () => {
    const base = await start();
    const res = await fetch(`${base}/api/analysis/run`, { method: 'OPTIONS', headers: {
      Origin: 'https://project.chatgpt.site', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type',
    } });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://project.chatgpt.site');
    expect(res.headers.get('access-control-allow-headers')).toBe('Content-Type');
  });
  it('rejects unknown production origins before executing API routes', async () => {
    const base = await start();
    for (const origin of ['https://attacker.example', 'http://localhost:3000']) {
      const res = await fetch(`${base}/api/analysis/run`, { method: 'POST', headers: { Origin: origin } });
      expect(res.status).toBe(403);
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    }
    expect(allowedOrigins({ NODE_ENV: 'development' })).toContain('http://localhost:3000');
    expect(allowedOrigins({ NODE_ENV: 'production', ALLOWED_ORIGINS: ' https://a.chatgpt.site,https://b.chatgpt.site ' })).toHaveLength(2);
    expect(() => allowedOrigins({ NODE_ENV: 'production', CHATGPT_SITE_ORIGIN: '*' })).toThrow();
  });
  it('reports Cloud Run metadata and configuration without claiming unverified connectivity', async () => {
    vi.stubEnv('K_SERVICE', 'project-x-api'); vi.stubEnv('GOOGLE_CLOUD_PROJECT', 'private-project');
    vi.stubEnv('CLICKHOUSE_HOST', ''); vi.stubEnv('GCS_BUCKET_NAME', '');
    const base = await start();
    const res = await fetch(`${base}/api/health`);
    const data = await res.json();
    expect(data.deployment).toBe('Google Cloud Run');
    expect(data.agent).toMatchObject({ framework: '@google/adk', vertexAi: true });
    expect(data.services).toEqual({ vertexAi: 'configured', clickhouse: 'disconnected', gcs: 'unconfigured' });
    expect(JSON.stringify(data)).not.toContain('private-project');
    expect((await fetch(base)).status).toBe(404);
  });
  it('detects Vertex configuration without a JSON key and refuses a key path alone', () => {
    expect(vertexConfig({ GOOGLE_CLOUD_PROJECT: 'test' })).toMatchObject({ configured: true, location: 'us-central1' });
    expect(vertexConfig({ GOOGLE_APPLICATION_CREDENTIALS: '/secret.json' }).configured).toBe(false);
  });
  it('rejects malformed, oversized, and invalid API payloads', async () => {
    const base = await start();
    for (const [body, status] of [['{', 400], [JSON.stringify({ scriptText: 'hello', sceneId: '../../secret' }), 400],
      [JSON.stringify({ scriptText: 'hello', videoSource: { url: 'x' } }), 400], [JSON.stringify({ scriptText: 'a'.repeat(1100000) }), 413]] as const) {
      const res = await fetch(`${base}/api/analysis/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      expect(res.status).toBe(status);
    }
  });
  it('does not read arbitrary files or fetch private media URLs', async () => {
    const agent = new GeminiDirectorAgent();
    expect((await agent.resolveVideoAsset('package.json')).attached).toBe(false);
    await expect(fetchVideo('https://127.0.0.1/video.mp4')).rejects.toThrow('Private');
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('MEDIA_ALLOWED_HOSTS', '');
    await expect(fetchVideo('https://unknown.example/video.mp4')).rejects.toThrow('approved');
  });
  it('never claims a local cache is a production GCS save', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('GCS_BUCKET_NAME', '');
    const result = await uploadArtifactToGcs('test.json', '{}');
    expect(result).toMatchObject({ persistedToGcs: false, provider: 'Not saved', url: '' });
  });
});
