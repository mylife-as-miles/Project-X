import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList } from 'node:net';

const blocked = new BlockList();
for (const [network, bits] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16], ['192.0.0.0', 24],
  ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) blocked.addSubnet(network, bits);

// Pin a public IPv4 address to prevent DNS rebinding; redirects are never followed.
export async function fetchVideo(source: string): Promise<Response> {
  const url = new URL(source);
  const hosts = (process.env.MEDIA_ALLOWED_HOSTS || '').split(',').map(v => v.trim()).filter(Boolean);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      (process.env.NODE_ENV === 'production' && !hosts.includes(url.hostname))) {
    throw new Error('Video URL must use HTTPS and an approved media host. Prefer gs:// for production.');
  }
  const addresses = await lookup(url.hostname, { family: 4, all: true });
  if (!addresses.length || addresses.some(({ address }) => blocked.check(address))) throw new Error('Private media hosts are forbidden.');
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [{ address: addresses[0].address, family: 4 }]);
        else callback(null, addresses[0].address, 4);
      },
    }, response => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error('Video download failed; redirects are unsupported.')); return; }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 20 * 1024 * 1024) { request.destroy(new Error('Video exceeds 20 MiB. Use a gs:// URI.')); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve(new Response(Buffer.concat(chunks), { headers: { 'content-type': response.headers['content-type'] || 'video/mp4' } })));
    });
    const timeout = setTimeout(() => request.destroy(new Error('Video download timed out.')), 30000);
    request.on('close', () => clearTimeout(timeout));
    request.on('error', reject);
  });
}
