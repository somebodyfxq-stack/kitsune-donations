import test from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "path";
import os from "node:os";
import { execSync } from "node:child_process";

interface RouteHandlers {
  webhookId: string;
  GET: () => Promise<Response>;
  POST: (
    req: NextRequest,
    ctx: { params: { webhookId: string } },
  ) => Promise<Response>;
}

let cached: RouteHandlers | null = null;

async function setup(): Promise<RouteHandlers> {
  if (cached) return cached;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "webhook-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete (globalThis as any).prisma;
  execSync("npx prisma db push --schema prisma/schema.prisma", {
    stdio: "ignore",
  });
  const { prisma } = await import("../lib/db.ts");
  const { upsertMonobankSettings } = await import("../lib/store.ts");
  const user = await prisma.user.create({ data: {} });
  const webhookId = "hook";
  await upsertMonobankSettings(user.id, { webhookId });
  const route = await import("@/app/api/monobank/webhook/[webhookId]/route.ts");
  cached = { webhookId, ...(route as RouteHandlers) };
  return cached;
}

test("GET /api/monobank/webhook/[webhookId] returns 200", async () => {
  const { GET } = await setup();
  const res = await GET();
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.deepStrictEqual(body, { ok: true });
});

test("ignores non-positive amount", async () => {
  const { POST, webhookId } = await setup();
  const req = new NextRequest("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount: 0 }),
  });
  const res = await POST(req, { params: { webhookId } });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.deepStrictEqual(body, {
    ok: true,
    ignored: true,
    reason: "Non-positive amount",
  });
});

test("logs parse errors and returns 400 on invalid JSON", async (t) => {
  const { POST, webhookId } = await setup();
  const errMock = t.mock.method(console, "error", () => {});
  const req = new NextRequest("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "invalid",
  });
  const res = await POST(req, { params: { webhookId } });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.deepStrictEqual(body, { ok: false, error: "Invalid JSON" });
  assert.strictEqual(errMock.mock.calls.length, 1);
});
