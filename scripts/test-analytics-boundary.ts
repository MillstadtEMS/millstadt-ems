import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { redactExpiredGeography } from "../lib/analytics/store";
import type { AnalyticsEventRecord } from "../lib/analytics/types";

const event = (occurredAt: string): AnalyticsEventRecord => ({
  id: occurredAt,
  eventName: "page_view",
  path: "/",
  occurredAt,
  sessionHash: null,
  browserHash: null,
  returningBrowser: null,
  returnIntervalDays: null,
  browserCategory: "other",
  operatingSystemCategory: "other",
  deviceCategory: "other",
  referringSource: "direct",
  country: "US",
  region: "IL",
  city: "Millstadt",
});

const now = Date.parse("2026-08-17T12:00:00.000Z");
const redacted = redactExpiredGeography(
  [event("2026-08-01T12:00:00.000Z"), event("2026-08-16T12:00:00.000Z")],
  now,
  7 * 86_400_000,
);
assert.deepEqual(
  [redacted[0].country, redacted[0].region, redacted[0].city],
  [null, null, null],
);
assert.deepEqual(
  [redacted[1].country, redacted[1].region, redacted[1].city],
  ["US", "IL", "Millstadt"],
);

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const tracker = readFileSync(`${repoRoot}/components/analytics/AnalyticsTracker.tsx`, "utf8");
assert.match(tracker, /previousPath !== pathname/);
assert.match(tracker, /send\("engagement", previousPath/);
assert.doesNotMatch(tracker, /\}, \[categories, pathname\]\);/);

console.log("Analytics boundary checks passed (5 assertions).");
