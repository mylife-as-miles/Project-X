// Legacy optional Vercel adapter. Canonical production backend: server/index.ts on Cloud Run.
import app from './index';

// Vercel serverless catch-all handler preserving /api/* subpaths
export default app;
