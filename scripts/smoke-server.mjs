import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const env = { ...process.env, NODE_ENV: 'production', PORT: '18080', K_SERVICE: 'local-cloud-run-smoke',
  GOOGLE_CLOUD_PROJECT: '', GCS_PROJECT_ID: '', GCS_BUCKET_NAME: '', CLICKHOUSE_HOST: '',
  GOOGLE_APPLICATION_CREDENTIALS: '', GEMINI_API_KEY: '', CHATGPT_SITE_ORIGIN: 'https://smoke.chatgpt.site', ALLOWED_ORIGINS: '' };
const child = spawn(process.execPath, ['build/server/index.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });
try {
  let health;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try { health = await fetch('http://127.0.0.1:18080/api/health'); break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert(health, `Server did not start: ${output}`);
  assert.equal(health.status, 200);
  const data = await health.json();
  assert.equal(data.deployment, 'Google Cloud Run');
  assert.equal(data.services.vertexAi, 'unconfigured');
  assert.equal(data.services.clickhouse, 'disconnected');
  assert.equal((await fetch('http://127.0.0.1:18080/')).status, 404);
  const allowed = await fetch('http://127.0.0.1:18080/api/health', { headers: { Origin: 'https://smoke.chatgpt.site' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://smoke.chatgpt.site');
  assert.equal((await fetch('http://127.0.0.1:18080/api/health', { headers: { Origin: 'https://unknown.example' } })).status, 403);
  console.log(JSON.stringify({ node: process.version, health: data, apiOnly: true, cors: 'passed' }, null, 2));
} finally { child.kill(); }
