import fs from 'node:fs';
import path from 'node:path';
export const secretNames = ['CLICKHOUSE_PASSWORD', 'CLICKHOUSE_HOST', 'CLICKHOUSE_USER', 'CLICKHOUSE_DATABASE',
  'GEMINI_API_KEY', 'GOOGLE_APPLICATION_CREDENTIALS'];
export function verifyFrontend(directory, env = process.env) {
  const forbidden = [...secretNames, 'BEGIN PRIVATE KEY', ...secretNames.map(name => env[name]).filter(value => value && value.length >= 8)];
  let files = 0;
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (/\.(js|css|html|map|json)$/.test(entry.name)) {
        files++;
        const content = fs.readFileSync(target, 'utf8');
        if (forbidden.some(value => content.includes(value))) throw new Error(`Secret material detected in frontend file: ${target}`);
      }
    }
  };
  walk(directory);
  if (!files) throw new Error('No frontend output found to verify');
  return files;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/verify-frontend.mjs')) {
  console.log(`Frontend secret scan passed (${verifyFrontend('dist')} files).`);
}
