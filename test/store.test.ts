import test from "node:test";
import assert from "node:assert";
import { createTestDatabase, cleanupTestDatabase as _cleanupTestDatabase } from "./test-utils.ts";

async function buildStore() {
  const { dir, prisma } = await createTestDatabase();
  const store = await import("../lib/store.ts");
  return { dir, prisma, ...store };
}

function buildIntent(i: number) {
  const now = new Date().toISOString();
  return {
    identifier: `ID${i}`,
    nickname: `nick${i}`,
    message: "",
    amount: i,
    createdAt: now,
    streamerId: "streamer",
  };
}

function buildEvent(i: number) {
  const now = new Date().toISOString();
  return {
    identifier: `ID${i}`,
    nickname: `nick${i}`,
    message: "",
    amount: i,
    monoComment: "",
    createdAt: now,
    streamerId: "streamer",
  };
}

test("appendIntent handles concurrent writes", async () => {
  const { appendIntent, prisma } = await buildStore();
  const intents = Array.from({ length: 20 }, (_, i) => buildIntent(i));
  await Promise.all(intents.map(appendIntent));
  const saved = await prisma.donationIntent.findMany();
  assert.strictEqual(saved.length, intents.length);
});

test("appendDonationEvent handles concurrent writes", async () => {
  const { appendDonationEvent, listDonationEvents, appendIntent } =
    await buildStore();
  const events = Array.from({ length: 20 }, (_, i) => buildEvent(i + 100));
  await Promise.all(events.map((_, i) => appendIntent(buildIntent(i + 100))));
  await Promise.all(events.map(appendDonationEvent));
  const saved = await listDonationEvents("streamer");
  assert.strictEqual(saved.length, events.length);
});

test("findIntentByIdentifier filters by streamerId", async () => {
  const { appendIntent, findIntentByIdentifier } = await buildStore();
  const intent = buildIntent(42);
  await appendIntent(intent);
  const found = await findIntentByIdentifier(intent.identifier, intent.streamerId);
  assert.ok(found);
  const missing = await findIntentByIdentifier(intent.identifier, "other");
  assert.strictEqual(missing, undefined);
});
