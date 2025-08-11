import { test } from "node:test";
import assert from "node:assert";
import { createRedirect } from "../lib/redirect";

test("redirects streamer to panel", async () => {
  const redirect = createRedirect(async () => ({
    user: { role: "streamer" },
  }));
  const url = await redirect({
    url: "http://localhost:3000",
    baseUrl: "http://localhost:3000",
  });
  assert.strictEqual(url, "http://localhost:3000/panel");
});
