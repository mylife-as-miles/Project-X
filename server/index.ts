import 'dotenv/config';
import { createApp } from './app';
import { initClickHouseSchema } from './db/clickhouse';
const app = createApp();
const port = Number(process.env.PORT || 8080);
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[Project X API] Listening on 0.0.0.0:${port}`);
  void initClickHouseSchema();
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 9000).unref();
});
export default app;
