/**
 * Board Portal — set EMS Board officer roles/titles.
 *   node scripts/board-officers.mjs
 * Idempotent. Joe = President (gets the ems_president role, which carries the
 * Fire-Board visibility control alongside the Administrator).
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
const url = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

// username, role, officer_title
const OFFICERS = [
  ["jwagner",   "ems_president", "President"],
  ["packer",    "ems_board",     "Vice President"],
  ["salberter", "ems_board",     "Treasurer"],
  ["llehr",     "ems_board",     "Secretary"],
];
for (const [u, role, title] of OFFICERS) {
  const r = await sql`UPDATE board_users SET role=${role}, officer_title=${title} WHERE username=${u}`;
  console.log(`  ${u} -> ${title} (${role})  [${r.length ?? "ok"}]`);
}
console.log("Officers set.");
