import { expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyFrontend } from '../scripts/verify-frontend.mjs';

it('rejects secret names and configured values in frontend output; accepts public config', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'project-x-bundle-'));
  try {
    writeFileSync(path.join(dir, 'app.js'), 'const base="https://public.run.app";');
    expect(verifyFrontend(dir, {})).toBe(1);
    for (const value of ['CLICKHOUSE_PASSWORD', 'GEMINI_API_KEY', 'GOOGLE_APPLICATION_CREDENTIALS', 'private-sentinel-value']) {
      writeFileSync(path.join(dir, 'app.js'), `const leaked=${JSON.stringify(value)};`);
      expect(() => verifyFrontend(dir, { CLICKHOUSE_PASSWORD: 'private-sentinel-value' })).toThrow('Secret material');
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
