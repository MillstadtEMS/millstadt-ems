const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
    reportDiagnostics: true,
  });
  module._compile(output.outputText, filename);
};

const { normalizeMlbSchedule, normalizeNhlScore } = require("../lib/community/sports.ts");
const { sportsDisplayWindow } = require("../lib/community/reliability.ts");

const checkedAt = "2026-08-17T23:00:00.000Z";

const mlb = normalizeMlbSchedule({
  dates: [{
    date: "2026-08-17",
    games: [{
      gamePk: 1,
      gameDate: "2026-08-17T22:40:00.000Z",
      gameType: "R",
      status: { abstractGameState: "Live", detailedState: "In Progress" },
      teams: {
        away: { score: 4, team: { id: 138, name: "St. Louis Cardinals" } },
        home: { score: 1, team: { id: 113, name: "Cincinnati Reds" } },
      },
      linescore: { currentInning: 6, inningState: "Top" },
      venue: { name: "Great American Ball Park" },
    }],
  }],
}, checkedAt);

assert.equal(mlb.length, 1);
assert.equal(mlb[0].state, "live");
assert.equal(mlb[0].awayTeam.score, 4);
assert.equal(mlb[0].homeTeam.score, 1);
assert.equal(mlb[0].inning, 6);
assert.equal(mlb[0].half, "top");

const mlbFinal = normalizeMlbSchedule({
  dates: [{
    date: "2026-08-17",
    games: [{
      gamePk: 2,
      gameDate: "2026-08-17T17:40:00.000Z",
      status: { abstractGameState: "Final", detailedState: "Final" },
      teams: {
        away: { score: 2, team: { id: 138, name: "St. Louis Cardinals" } },
        home: { score: 1, team: { id: 113, name: "Cincinnati Reds" } },
      },
      linescore: { currentInning: 9, inningState: "End" },
      gameInfo: { gameDurationMinutes: 154, firstPitch: "2026-08-17T17:42:00.000Z" },
    }],
  }],
}, checkedAt);

assert.equal(mlbFinal[0].state, "final");
assert.equal(mlbFinal[0].final, true);
assert.equal(mlbFinal[0].awayTeam.score, 2);
assert.equal(mlbFinal[0].homeTeam.score, 1);
assert.ok(mlbFinal[0].completedAt instanceof Date);

const nhl = normalizeNhlScore({
  games: [{
    id: 3,
    gameDate: "2026-10-08",
    startTimeUTC: "2026-10-09T00:00:00.000Z",
    gameState: "LIVE",
    gameScheduleState: "OK",
    periodDescriptor: { number: 2, periodType: "REG" },
    clock: { timeRemaining: "05:32" },
    awayTeam: { abbrev: "SJS", score: 1, name: { default: "San Jose Sharks" } },
    homeTeam: { abbrev: "STL", score: 3, name: { default: "St. Louis Blues" } },
  }],
}, checkedAt);

assert.equal(nhl[0].state, "live");
assert.equal(nhl[0].period, 2);
assert.equal(nhl[0].clock, "05:32");
assert.equal(nhl[0].homeTeam.score, 3);
assert.equal(nhl[0].awayTeam.score, 1);

const finalWindow = sportsDisplayWindow({
  now: new Date("2026-08-18T01:00:00.000Z"),
  start: mlbFinal[0].start,
  gameDateKey: mlbFinal[0].gameDateKey,
  state: "final",
  completedAt: mlbFinal[0].completedAt,
});
assert.equal(finalWindow.visible, true);
assert.equal(finalWindow.endsAt.toISOString(), "2026-08-18T05:00:00.000Z");

const expiredFinalWindow = sportsDisplayWindow({
  now: new Date("2026-08-18T05:01:00.000Z"),
  start: mlbFinal[0].start,
  gameDateKey: mlbFinal[0].gameDateKey,
  state: "final",
  completedAt: mlbFinal[0].completedAt,
});
assert.equal(expiredFinalWindow.visible, false);

const alertsSource = fs.readFileSync(path.join(__dirname, "../lib/community/alerts.ts"), "utf8");
const routeSource = fs.readFileSync(path.join(__dirname, "../app/api/public/community-alerts/route.ts"), "utf8");
const tickerSource = fs.readFileSync(path.join(__dirname, "../components/CommunityAlertTicker.tsx"), "utf8");
assert.match(alertsSource, /STL \$\{cardinalsScore\}.*\$\{progress/);
assert.match(alertsSource, /STL \$\{bluesScore\}.*\$\{progress/);
assert.match(routeSource, /s-maxage=20/);
assert.match(tickerSource, /alert\.state === "live".*30 \* 1000/);
assert.match(tickerSource, /hidden min-w-0 items-center overflow-visible md:flex/);
assert.match(tickerSource, /grouped\.set\(key,/);

console.log("Sports score boundary checks passed (live scores, game progress, finals, and refresh cadence)." );
