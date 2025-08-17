import test from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

async function buildStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "store-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete (globalThis as any).prisma;
  execSync("npx prisma db push --schema prisma/schema.prisma", {
    stdio: "ignore",
  });
  const store = await import("../lib/store.ts");
  const db = await import("../lib/db.ts");
  await db.prisma.user.upsert({
    where: { id: "streamer" },
    update: {},
    create: { id: "streamer" },
  });
  return { dir, prisma: db.prisma, ...store };
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
  const saved = await listDonationEvents();
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
