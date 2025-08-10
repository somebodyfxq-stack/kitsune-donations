import test from 'node:test';
import assert from 'node:assert';
import { configureWebhook } from '@/lib/monobank-webhook';

test('sends POST to Monobank with token', async (t) => {
  process.env.MONOBANK_TOKEN = 'token';
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
  delete process.env.MONOBANK_TOKEN;
});

test('throws on non-ok response with details', async (t) => {
  process.env.MONOBANK_TOKEN = 'token';
  t.mock.method(globalThis, 'fetch', async () =>
    new Response('err', { status: 500 }),
  );
  await assert.rejects(
    () => configureWebhook('https://example.com/hook'),
    /Failed to configure Monobank webhook: 500 err/,
  );
  delete process.env.MONOBANK_TOKEN;
});

test('warns if webhook already configured', async (t) => {
  process.env.MONOBANK_TOKEN = 'token';
  t.mock.method(globalThis, 'fetch', async () =>
    new Response('already set', { status: 400 }),
  );
  const warnMock = t.mock.method(console, 'warn', () => {});
  await configureWebhook('https://example.com/hook');
  assert.strictEqual(warnMock.mock.calls.length, 1);
  delete process.env.MONOBANK_TOKEN;
});
