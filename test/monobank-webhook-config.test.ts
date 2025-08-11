import test from 'node:test';
import assert from 'node:assert';
import { configureWebhook } from '@/lib/monobank-webhook';
import fs from 'node:fs/promises';
import path from 'path';
import os from 'node:os';
import { execSync } from 'node:child_process';

async function setupToken() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webhook-test-'));
  process.env.DATABASE_URL = `file:${path.join(dir, 'test.db')}`;
  delete (globalThis as any).prisma;
  execSync('npx prisma db push --schema prisma/schema.prisma', { stdio: 'ignore' });
  const { setSetting } = await import('../lib/store.ts');
  await setSetting('monobankToken', 'token');
}

test('sends POST to Monobank with token', async (t) => {
  await setupToken();
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    new Response('{}', { status: 200 }),
  );
  await configureWebhook('https://example.com/hook');
  assert.strictEqual(fetchMock.mock.calls.length, 1);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.strictEqual(url, 'https://api.monobank.ua/personal/webhook');
  assert.strictEqual(options?.method, 'POST');
  assert.strictEqual(options?.headers?.['X-Token'], 'token');
  assert.strictEqual(
    options?.body,
    JSON.stringify({ webHookUrl: 'https://example.com/hook' }),
  );
});

test('throws on non-ok response with details', async (t) => {
  await setupToken();
  t.mock.method(globalThis, 'fetch', async () =>
    new Response('err', { status: 500 }),
  );
  await assert.rejects(
    () => configureWebhook('https://example.com/hook'),
    /Failed to configure Monobank webhook: 500 err/,
  );
});

test('warns if webhook already configured', async (t) => {
  await setupToken();
  t.mock.method(globalThis, 'fetch', async () =>
    new Response('already set', { status: 400 }),
  );
  const warnMock = t.mock.method(console, 'warn', () => {});
  await configureWebhook('https://example.com/hook');
  assert.strictEqual(warnMock.mock.calls.length, 1);
});

test('warns if webhook URL check fails', async (t) => {
  await setupToken();
  t.mock.method(globalThis, 'fetch', async () =>
    new Response('Check webHookUrl failed', { status: 400 }),
  );
  const warnMock = t.mock.method(console, 'warn', () => {});
  await configureWebhook('https://example.com/hook');
  assert.strictEqual(warnMock.mock.calls.length, 1);
});
