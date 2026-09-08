import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
let checks = 0;

function source(path) {
  try {
    return readFileSync(resolve(root, path), "utf8");
  } catch (error) {
    failures.push(`${path}: could not be read (${error instanceof Error ? error.message : "unknown error"})`);
    return "";
  }
}

function requireText(path, text, reason) {
  checks += 1;
  if (!source(path).includes(text)) failures.push(`${path}: ${reason}`);
}

function forbidText(path, text, reason) {
  checks += 1;
  if (source(path).includes(text)) failures.push(`${path}: ${reason}`);
}

const workflowPath = ".github/workflows/ai-site-monitor.yml";
const workflow = source(workflowPath);
const cronEntries = [...workflow.matchAll(/- cron: "([^"]+)"/g)].map((match) => match[1]);
checks += 1;
if (cronEntries.length !== 1) {
  failures.push(`${workflowPath}: the read-only monitor must have exactly one daily schedule`);
}
requireText(workflowPath, '- cron: "17 8 * * *"', "the daily off-peak security schedule must remain enabled");
requireText(workflowPath, 'nightlyStatus === "completed"', "the workflow must recognize a completed nightly scan");
requireText(workflowPath, 'nightlyReason === "already_processed"', "duplicate invocations must remain safe");
requireText(workflowPath, "process.exit(1)", "failed or disabled scans must make the workflow visibly fail");
requireText(workflowPath, "body.reportOnly !== true", "the workflow must reject a monitor that is not read-only");

const routePath = "app/api/cron/ai-monitor/route.ts";
requireText(routePath, 'runAiMonitor("nightly_security", chicago.date, now)', "the endpoint must run the daily security monitor");
requireText(routePath, 'runAiMonitor("weekly_analytics", chicago.date, now)', "the Sunday analytics monitor must remain connected");
forbidText(routePath, "outside_chicago_schedule_window", "delayed scheduler calls must not be skipped");
forbidText(routePath, "chicago.hour", "the endpoint must not depend on an exact launch hour");
requireText(routePath, "reportOnly: true", "the monitor must remain read-only");
requireText(routePath, "hasValidBearerSecret", "the monitor endpoint must remain protected by its secret");

const runnerPath = "lib/ai-monitor/runner.ts";
requireText(runnerPath, 'const runKey = reportType + ":" + localDate', "each report must remain limited to one run per local date");
requireText(runnerPath, "reserveAiMonitorRun(runKey", "each daily run must be reserved before scanning");
requireText(runnerPath, 'existingStatus === "completed"', "only a completed prior scan may count as an already-processed success");
requireText(runnerPath, "existing_run_", "stuck or unsuccessful prior scans must remain visible failures");

const storePath = "lib/ai-monitor/store.ts";
requireText(storePath, "run_key TEXT NOT NULL UNIQUE", "the database must enforce one run per daily key");
requireText(storePath, "ON CONFLICT (run_key) DO NOTHING", "duplicate scheduler calls must remain harmless");
requireText(storePath, "SELECT id, status", "duplicate handling must read the durable result of the original scan");

if (failures.length > 0) {
  console.error("Protected AI-monitor schedule failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nFix these regressions before building or deploying.");
  process.exit(1);
}

console.log(`Protected AI-monitor schedule passed (${checks} checks).`);
