import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  PUBLIC_ECG_CASES,
  casesForSkill,
  chicagoDateKey,
  dailyCaseIndex,
  orderedChallengeCases,
} from "../lib/clinical/public-ecg";
import { CALL_911_STEPS } from "../lib/kids/call-911";
import {
  chicagoDateTimeKey,
  parseSeasonalThemeWindows,
  resolveSeasonalTheme,
} from "../lib/seasonal/themes";

const root = process.cwd();
const source = (path: string) => readFile(resolve(root, path), "utf8");

async function main() {
assert.equal(chicagoDateKey(new Date("2026-01-01T05:59:00Z")), "2025-12-31");
assert.equal(chicagoDateKey(new Date("2026-01-01T06:01:00Z")), "2026-01-01");
assert.equal(chicagoDateKey(new Date("2026-03-08T07:59:00Z")), "2026-03-08");
assert.equal(chicagoDateKey(new Date("2026-03-08T08:01:00Z")), "2026-03-08");

const dailyIndex = dailyCaseIndex("2026-08-17", PUBLIC_ECG_CASES.length);
assert.equal(dailyIndex, dailyCaseIndex("2026-08-17", PUBLIC_ECG_CASES.length));
assert.ok(dailyIndex >= 0 && dailyIndex < PUBLIC_ECG_CASES.length);
assert.equal(dailyCaseIndex("2026-08-17", 0), 0);

const studentCases = casesForSkill("student");
assert.ok(studentCases.length >= 2);
assert.ok(studentCases.every((item) => item.level === "Foundation"));
assert.ok(PUBLIC_ECG_CASES.every((item) => item.choices.length === 3));
assert.ok(PUBLIC_ECG_CASES.every((item) => item.choices.includes(item.answer)));

const ordered = orderedChallengeCases("clinician", "2026-08-17");
assert.equal(ordered.length, PUBLIC_ECG_CASES.length);
assert.deepEqual(
  new Set(ordered.map((item) => item.id)),
  new Set(PUBLIC_ECG_CASES.map((item) => item.id)),
);

assert.equal(CALL_911_STEPS.length, 8);
assert.ok(CALL_911_STEPS.some((step) => step.title === "Call 911"));
assert.ok(CALL_911_STEPS.some((step) => step.body.includes("Do not touch medicine or medical equipment")));
assert.ok(CALL_911_STEPS.every((step) => !/email|upload|leaderboard|account/i.test(`${step.title} ${step.body}`)));
assert.ok(CALL_911_STEPS.every((step) => !/locked phone/i.test(step.body)));

assert.equal(chicagoDateTimeKey(new Date("2026-03-08T07:59:00Z")), "2026-03-08T01:59");
assert.equal(chicagoDateTimeKey(new Date("2026-03-08T08:01:00Z")), "2026-03-08T03:01");
const themeWindows = parseSeasonalThemeWindows(JSON.stringify([
  { id: "halloween", startsAt: "2026-10-24T07:00", endsAt: "2026-11-01T02:00", enabled: true },
  { id: "not-a-theme", startsAt: "2026-01-01T00:00", endsAt: "2026-01-02T00:00" },
]));
assert.equal(themeWindows.length, 1);
assert.equal(resolveSeasonalTheme({ now: new Date("2026-10-24T11:59:00Z"), windows: themeWindows }), "normal");
assert.equal(resolveSeasonalTheme({ now: new Date("2026-10-24T12:01:00Z"), windows: themeWindows }), "halloween");
assert.equal(resolveSeasonalTheme({ now: new Date("2026-11-01T07:30:00Z"), windows: themeWindows }), "halloween");
assert.equal(resolveSeasonalTheme({ now: new Date("2026-11-01T08:01:00Z"), windows: themeWindows }), "normal");
assert.equal(resolveSeasonalTheme({ override: "winter", windows: themeWindows }), "winter");
assert.equal(resolveSeasonalTheme({ disabled: true, override: "winter", windows: themeWindows }), "normal");
assert.deepEqual(parseSeasonalThemeWindows("bad json"), []);

await access(resolve(root, "app/kids-club/printables/911-call-guide/page.tsx"));
await assert.rejects(access(resolve(root, "public/kids-club/coloring/ambulance-and-rescue.png")));
await assert.rejects(access(resolve(root, "public/kids-club/coloring/ambulance-and-rescue.pdf")));

const layout = await source("app/layout.tsx");
const footer = await source("components/Footer.tsx");
const ambulance = await source("components/AmboScroll.tsx");
const ecg = await source("components/clinical/EcgPatternChallenge.tsx");
const seasonal = await source("lib/seasonal/themes.ts");
const serviceWorker = await source("public/sw.js");
const kids = [
  await source("app/kids-club/page.tsx"),
  await source("app/kids-club/games/page.tsx"),
  await source("components/kids/Call911Story.tsx"),
].join("\n");

assert.doesNotMatch(layout, /WeatherAlertOverlay/);
assert.doesNotMatch(footer, /Units Active/);
assert.match(ambulance, /prefers-reduced-motion: reduce/);
assert.match(ambulance, /sessionStorage\.getItem\(SESSION_KEY\)/);
assert.doesNotMatch(ambulance, /ambo-lights|step-start/);
assert.match(ecg, /mode === "timed"/);
assert.match(ecg, /setPaused/);
assert.match(ecg, /KeyboardEvent/);
assert.doesNotMatch(ecg, /fetch\(|leaderboard|email|localStorage/);
assert.doesNotMatch(kids, /EcgPatternChallenge|lead-ii|leaderboard|<input|<textarea|<form/);
assert.match(serviceWorker, /"\/ecg-challenge"/);
assert.match(serviceWorker, /"\/kids-club\/printables\/911-call-guide"/);
assert.match(serviceWorker, /"\/financials-information-hub"/);
assert.match(seasonal, /DISABLE_PUBLIC_SEASONAL_THEMES/);
assert.match(seasonal, /PUBLIC_SEASONAL_THEME_OVERRIDE/);
assert.match(seasonal, /PUBLIC_SEASONAL_THEMES_JSON/);
assert.doesNotMatch(seasonal, /2026-10-24|2026-11-01/);

console.log("Public experience checks passed (47 assertions).");
}

void main();
