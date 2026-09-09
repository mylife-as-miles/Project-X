import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './api';
import { initClickHouseSchema } from './db/clickhouse';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '25mb' }));

// Mount API router
app.use('/api', apiRouter);

// Serve static frontend assets in production if built dist exists
const distDir = path.resolve('dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Initialize database schema in background if configured
initClickHouseSchema().catch(e => console.warn('[ClickHouse] Startup init notice:', e.message));

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Project X Production Server] Running on http://localhost:${PORT}`);
  });
}

export default app;
