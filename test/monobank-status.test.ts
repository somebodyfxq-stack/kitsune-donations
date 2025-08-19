import test from "node:test";
import assert from "node:assert";
import type { DonationEvent } from "@prisma/client";
import { createTestDatabase } from "./test-utils.ts";

async function setup(events: Array<Omit<DonationEvent, "id">>) {
  const { prisma } = await createTestDatabase();
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
  const res = await GET(new Request("http://localhost", { headers: { "x-user-id": "streamer" } }));
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.deepStrictEqual(body, { isActive: false, event: null });
});

test("returns latest event", async () => {
  const events: Array<Omit<DonationEvent, "id">> = [
    {
      identifier: "AAA-111",
      nickname: "x",
      message: "m",
      amount: 1,
      monoComment: "",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      streamerId: "streamer",
    },
    {
      identifier: "BBB-222",
      nickname: "y",
      message: "n",
      amount: 2,
      monoComment: "",
      createdAt: new Date("2024-01-02T00:00:00.000Z"),
      streamerId: "streamer",
    },
  ];
  const { GET } = await setup(events);
  const res = await GET(new Request("http://localhost", { headers: { "x-user-id": "streamer" } }));
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
