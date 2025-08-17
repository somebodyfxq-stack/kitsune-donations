import test from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "path";
import os from "node:os";
import { execSync } from "node:child_process";
import type { DonationEvent } from "@prisma/client";

async function setup(events: DonationEvent[]) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "status-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete (globalThis as any).prisma;
  execSync("npx prisma db push --schema prisma/schema.prisma", {
    stdio: "ignore",
  });
  const { prisma } = await import("../lib/db.ts");
  await prisma.user.upsert({
    where: { id: "streamer" },
    update: {},
    create: { id: "streamer" },
  });
  if (events.length) {
    await prisma.donationIntent.createMany({
      data: events.map((e) => ({
        identifier: e.identifier.toLowerCase(),
        nickname: e.nickname,
        message: e.message,
        amount: e.amount,
        createdAt: new Date(e.createdAt),
        streamerId: "streamer",
      })),
    });
    await prisma.donationEvent.createMany({
      data: events.map((e) => ({
        ...e,
        identifier: e.identifier.toLowerCase(),
        createdAt: new Date(e.createdAt),
      })),
    });
  }
  const { GET } = await import("../app/api/monobank/status/route.ts");
  return { GET };
}

test("reports inactive when no events", async () => {
  const { GET } = await setup([]);
  const res = await GET(new Request("http://localhost"));
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.deepStrictEqual(body, { isActive: false, event: null });
});

test("returns latest event", async () => {
  const events: DonationEvent[] = [
    {
      identifier: "AAA-111",
      nickname: "x",
      message: "m",
      amount: 1,
      monoComment: "",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    },
    {
      identifier: "BBB-222",
      nickname: "y",
      message: "n",
      amount: 2,
      monoComment: "",
      createdAt: new Date("2024-01-02T00:00:00.000Z"),
    },
  ];
  const { GET } = await setup(events);
  const res = await GET(new Request("http://localhost"));
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.isActive, true);
  assert.deepStrictEqual(body.event, {
    ...events[1],
    identifier: events[1].identifier.toLowerCase(),
    createdAt: events[1].createdAt.toISOString(),
    id: body.event.id,
  });
});
