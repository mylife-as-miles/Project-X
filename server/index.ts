import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { apiRouter } from './api';
import { initClickHouseSchema } from './db/clickhouse';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '25mb' }));

// Mount API router
app.use('/api', apiRouter);

// Initialize database schema in background
initClickHouseSchema().catch(e => console.warn('[ClickHouse] Startup init notice:', e.message));

app.listen(PORT, () => {
  console.log(`[Project X Server] Running on http://localhost:${PORT}`);
});

export default app;
