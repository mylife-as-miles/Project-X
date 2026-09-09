import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ createClient: vi.fn(() => ({ ping: vi.fn() })) }));
vi.mock('@clickhouse/client', () => mocks);
import { getClickHouseClient } from '../server/db/clickhouse';
afterEach(() => vi.unstubAllEnvs());
it('initializes ClickHouse with server-only Cloud Run environment settings', () => {
  vi.stubEnv('CLICKHOUSE_HOST', 'https://analytics.example:8443');
  vi.stubEnv('CLICKHOUSE_USER', 'project-x'); vi.stubEnv('CLICKHOUSE_PASSWORD', 'test-password');
  vi.stubEnv('CLICKHOUSE_DATABASE', 'project_x');
  expect(getClickHouseClient()).not.toBeNull();
  expect(mocks.createClient).toHaveBeenCalledWith(expect.objectContaining({
    url: 'https://analytics.example:8443', username: 'project-x', password: 'test-password', database: 'project_x',
  }));
});
