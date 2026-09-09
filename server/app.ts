import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { apiRouter } from './api';

export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const origins = [env.CHATGPT_SITE_ORIGIN, env.ALLOWED_ORIGINS]
    .flatMap(value => (value || '').split(',')).map(value => value.trim()).filter(Boolean);
  if (env.NODE_ENV !== 'production') origins.push('http://localhost:3000', 'http://localhost:5173');
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol) ||
        (env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
      throw new Error('Allowed origins must be exact origins (HTTPS in production), without paths or wildcards.');
    }
  }
  return [...new Set(origins)];
}

export function createApp(env: NodeJS.ProcessEnv = process.env) {
  const app = express();
  const origins = allowedOrigins(env);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.vary('Origin');
    if (req.headers.origin && !origins.includes(req.headers.origin)) {
      res.status(403).json({ code: 'CORS_ORIGIN_DENIED', error: 'CORS failure: origin is not allowed.' });
      return;
    }
    next();
  });
  app.use(cors({ origin: origins, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', apiRouter);
  app.use((_req, res) => { res.status(404).json({ error: 'API route not found' }); });
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
    res.status(status).json({ code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_REQUEST',
      error: status === 413 ? 'Request too large. Use a direct video URL or gs:// URI.' : status === 400 ? 'Invalid JSON body' : 'API request failed' });
  };
  app.use(handleError);
  return app;
}
