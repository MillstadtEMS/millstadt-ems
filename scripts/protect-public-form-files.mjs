import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());
const manifest = JSON.parse(readFileSync(resolve(root, "scripts/public-form-protected-files.json"), "utf8"));
const failures = [];
for (const [path, expected] of Object.entries(manifest.files)) {
  try {
    const actual = createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");
    if (actual !== expected) failures.push(path);
  } catch {
    failures.push(path);
  }
}
if (Object.keys(manifest.files).length < 20) failures.push("protected file coverage was removed");
if (failures.length) {
  console.error("Protected public-form files changed:\n" + failures.map((path) => `- ${path}`).join("\n"));
  console.error("Restore unintended edits. For an authorized form repair, run the full public-form tests and intentionally review/update the fingerprint manifest. See docs/PUBLIC_FORM_PROTECTION.md.");
  process.exit(1);
}
console.log(`Public-form fingerprints verified (${Object.keys(manifest.files).length} protected files).`);
