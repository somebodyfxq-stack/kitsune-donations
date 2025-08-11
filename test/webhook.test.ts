import test from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/monobank/webhook/route.ts";

test("GET /api/monobank/webhook returns 200", async function () {
  const res = await GET();
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.deepStrictEqual(body, { ok: true });
});

// Ensure non-positive amounts are ignored
test("ignores non-positive amount", async () => {
  const req = new NextRequest("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount: 0 }),
  });
  const res = await POST(req);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.deepStrictEqual(body, {
    ok: true,
    ignored: true,
    reason: "Non-positive amount",
  });
});

// Invalid JSON should log error and return 400
test("logs parse errors and returns 400 on invalid JSON", async (t) => {
  const errMock = t.mock.method(console, "error", () => {});
  const req = new NextRequest("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "invalid",
  });
  const res = await POST(req);
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.deepStrictEqual(body, { ok: false, error: "Invalid JSON" });
  assert.strictEqual(errMock.mock.calls.length, 1);
});
