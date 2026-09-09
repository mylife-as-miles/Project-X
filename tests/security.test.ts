import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Secret Security & Client Bundle Hygiene', () => {
  it('ensures vite.config.ts does not embed GEMINI_API_KEY in client define', () => {
    const viteConfig = fs.readFileSync(path.resolve('vite.config.ts'), 'utf-8');
    expect(viteConfig).not.toContain('process.env.GEMINI_API_KEY');
    expect(viteConfig).not.toContain('CLICKHOUSE_PASSWORD');
  });

  it('ensures src/ code does not reference process.env.GEMINI_API_KEY directly', () => {
    const srcDir = path.resolve('src');
    const checkDir = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
          checkDir(full);
        } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
          const content = fs.readFileSync(full, 'utf-8');
          expect(content).not.toContain('process.env.GEMINI_API_KEY');
          expect(content).not.toContain('process.env.CLICKHOUSE_PASSWORD');
          for (const secret of ['CLICKHOUSE_HOST', 'CLICKHOUSE_USER', 'CLICKHOUSE_DATABASE', 'GOOGLE_APPLICATION_CREDENTIALS', 'GEMINI_API_KEY', 'CLICKHOUSE_PASSWORD']) {
            expect(content).not.toContain(secret);
          }
        }
      }
    };

    checkDir(srcDir);
  });
});
