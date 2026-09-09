import express from 'express';
import { apiRouter } from '../server/api';

const app = express();
app.use(express.json({ limit: '25mb' }));

// Mount API router for both stripped (/health) and preserved (/api/health) paths
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
