import test from "node:test";
import assert from "node:assert";
import { configureWebhook } from "@/lib/monobank-webhook";
import { createTestDatabase } from "./test-utils.ts";

async function setupToken() {
  const { prisma } = await createTestDatabase();
  const { upsertMonobankSettings } = await import("../lib/store.ts");
  const user = await prisma.user.create({ data: {} });
  await upsertMonobankSettings(user.id, { token: "token" });
  return user.id;
}

test("sends POST to Monobank with token", async (t) => {
  const userId = await setupToken();
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("{}", { status: 200 }),
  );
  await configureWebhook("https://example.com/hook", undefined, userId);
  assert.strictEqual(fetchMock.mock.calls.length, 1);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.strictEqual(url, "https://api.monobank.ua/personal/webhook");
  assert.strictEqual(options?.method, "POST");
  assert.strictEqual(options?.headers?.["X-Token"], "token");
  assert.strictEqual(
    options?.body,
    JSON.stringify({ webHookUrl: "https://example.com/hook" }),
  );
});

test("throws on non-ok response with details", async (t) => {
  const userId = await setupToken();
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("err", { status: 500 }),
  );
  await assert.rejects(
    () => configureWebhook("https://example.com/hook", undefined, userId),
    /Failed to configure Monobank webhook: 500 err/,
  );
});

test("warns if webhook already configured", async (t) => {
  const userId = await setupToken();
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("already set", { status: 400 }),
  );
  const warnMock = t.mock.method(console, "warn", () => {});
  await configureWebhook("https://example.com/hook", undefined, userId);
  assert.strictEqual(warnMock.mock.calls.length, 1);
});

test("warns if webhook URL check fails", async (t) => {
  const userId = await setupToken();
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Check webHookUrl failed", { status: 400 }),
  );
  const warnMock = t.mock.method(console, "warn", () => {});
  await configureWebhook("https://example.com/hook", undefined, userId);
  assert.strictEqual(warnMock.mock.calls.length, 1);
});
