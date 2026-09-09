export function normalizeApiBase(value: string = '', production = false): string {
  const base = value.trim().replace(/\/+$/, '');
  if (!base) {
    if (production) throw new Error('API URL is not configured. Set VITE_API_BASE_URL and rebuild the frontend.');
    return '';
  }
  const url = new URL(base);
  if (url.origin !== base || !['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:')) {
    throw new Error('API URL must be an origin without a path (HTTPS in production).');
  }
  return base;
}

export function apiUrl(path: string): string {
  return `${normalizeApiBase(import.meta.env.VITE_API_BASE_URL, import.meta.env.PROD)}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  let response: Response;
  try { response = await fetch(url, init); }
  catch { throw new Error('API unreachable or CORS blocked the response. Check the backend URL, network, and allowed site origin. Browsers do not expose which caused this failure.'); }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`${data.error || 'API request failed'} (HTTP ${response.status}${data.code ? `, ${data.code}` : ''})`);
  }
  return response;
}
