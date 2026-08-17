import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const APP_DIR = path.resolve("app");
const OUTPUT = path.resolve("SECURITY_ROUTE_INVENTORY.md");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

function routePath(file, leaf) {
  const relative = path.relative(APP_DIR, file).replaceAll(path.sep, "/");
  const withoutLeaf = relative.slice(0, -leaf.length);
  const withoutGroups = withoutLeaf
    .split("/")
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .join("/");
  return `/${withoutGroups}`.replace(/\/$/, "") || "/";
}

function accessFamily(route) {
  if (route.startsWith("/admin") || route.startsWith("/api/admin")) return "Administrator";
  if (route.startsWith("/lounge") || route.startsWith("/api/lounge")) return "Employee Lounge";
  if (route.startsWith("/board") || route.startsWith("/api/board")) return "Board portal";
  if (route.startsWith("/inventory") || route.startsWith("/api/inventory")) return "Inventory";
  if (route.startsWith("/truckcheck") || route.startsWith("/api/truckcheck")) return "Truck check";
  if (route.startsWith("/api/cron")) return "Scheduled job";
  return "Public";
}

function sourceSignals(source) {
  const signals = [];
  if (/\bFile\b|formData\(|@vercel\/blob|\bput\(/.test(source)) signals.push("upload/blob");
  if (/patient|treatment|medical_conditions|medicalConditions|allergies|blood_type|bloodType|immunization|ssn/i.test(source)) signals.push("PHI/sensitive terms");
  if (/gmail|nodemailer|sendMail|messages\.send|twilio/i.test(source)) signals.push("external delivery");
  if (/currentEmployee|requireEmployee|requireAdmin|isAdminAuthed|currentBoardUser|isInventoryAuthed|isTruckCheckAuthed|verifySession|requireAnalyticsSupervisor|requireFinancialsAdmin/i.test(source)) signals.push("source auth check");
  return signals.join(", ") || "none detected";
}

const files = await walk(APP_DIR);
const pages = files.filter((file) => /\/page\.tsx?$/.test(file)).sort();
const handlers = files.filter((file) => /\/route\.ts$/.test(file)).sort();

const lines = [
  "# Site Security Route Inventory",
  "",
  "Generated from the checked-out source on 2026-08-16. This is a source inventory, not proof that deployment, database, vendor, or network controls are correctly configured.",
  "",
  `- Pages: ${pages.length}`,
  `- API handlers: ${handlers.length}`,
  "",
  "## Pages",
  "",
  "| Route | Access family | Source |",
  "| --- | --- | --- |",
];

for (const file of pages) {
  const route = routePath(file, "/page.tsx");
  lines.push(`| \`${route}\` | ${accessFamily(route)} | \`${path.relative(process.cwd(), file)}\` |`);
}

lines.push(
  "",
  "## API Handlers",
  "",
  "The signal column is deliberately conservative. A missing source-auth signal is a review flag, not automatic proof of exposure; middleware, signed tokens, webhook validation, or intentionally public behavior may apply.",
  "",
  "| Route | Methods | Access family | Review signals | Source |",
  "| --- | --- | --- | --- | --- |",
);

for (const file of handlers) {
  const source = await readFile(file, "utf8");
  const methods = [...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/g)]
    .map((match) => match[1]);
  const route = routePath(file, "/route.ts");
  lines.push(`| \`${route}\` | ${methods.join(", ") || "implicit"} | ${accessFamily(route)} | ${sourceSignals(source)} | \`${path.relative(process.cwd(), file)}\` |`);
}

lines.push("");
await writeFile(OUTPUT, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${path.relative(process.cwd(), OUTPUT)} (${pages.length} pages, ${handlers.length} API handlers).`);
