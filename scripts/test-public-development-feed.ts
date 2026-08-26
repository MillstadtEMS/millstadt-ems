import assert from "node:assert/strict";
import { test } from "node:test";
import { readPublicDevelopmentFeed, shouldReadPublicDevelopmentFeed, PUBLIC_CAD_LOG_URL } from "../lib/cad/public-development-feed";

test("public fallback is local-development-only and never overrides a configured database", () => {
  assert.equal(shouldReadPublicDevelopmentFeed({ NODE_ENV: "development" }), true);
  assert.equal(shouldReadPublicDevelopmentFeed({ NODE_ENV: "development", DATABASE_URL: "configured" }), false);
  assert.equal(shouldReadPublicDevelopmentFeed({ NODE_ENV: "production" }), false);
  assert.equal(shouldReadPublicDevelopmentFeed({ NODE_ENV: "test" }), false);
  assert.equal(shouldReadPublicDevelopmentFeed({}), false);
});

test("each refresh reads the canonical feed without cache and strips audit fields", async () => {
  let reads = 0;
  const fetchFeed: typeof fetch = async (url, options) => {
    assert.equal(url, PUBLIC_CAD_LOG_URL);
    assert.equal(options?.cache, "no-store");
    assert.ok(options?.signal instanceof AbortSignal);
    reads += 1;
    return Response.json(Array.from({ length: reads }, (_, index) => ({ id: `synthetic-${index}`, editedBy: "synthetic-audit", editedAt: "synthetic-time" })));
  };
  assert.deepEqual(await readPublicDevelopmentFeed(fetchFeed), [{ id: "synthetic-0" }]);
  assert.equal((await readPublicDevelopmentFeed(fetchFeed)).length, 2);
  assert.equal(reads, 2);
});

test("an empty successful feed is a real zero, not an error fallback", async () => {
  assert.deepEqual(await readPublicDevelopmentFeed(async () => Response.json([])), []);
});

test("HTTP errors and invalid responses never become fake zero counts", async () => {
  await assert.rejects(readPublicDevelopmentFeed(async () => new Response(null, { status: 503 })));
  await assert.rejects(readPublicDevelopmentFeed(async () => Response.json({ error: "Unavailable" })));
  await assert.rejects(readPublicDevelopmentFeed(async () => Response.json([null])));
  await assert.rejects(readPublicDevelopmentFeed(async () => { throw new Error("Network unavailable"); }));
});
