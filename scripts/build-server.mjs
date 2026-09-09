import { build } from 'esbuild';
await build({ entryPoints: ['server/index.ts'], outfile: 'build/server/index.js',
  bundle: true, platform: 'node', target: 'node20', format: 'esm', packages: 'external' });
