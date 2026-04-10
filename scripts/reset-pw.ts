import { neon } from "@neondatabase/serverless";
import { scryptSync, randomBytes } from "crypto";

async function main() {
  const db = neon(process.env.DATABASE_URL!);

  // Check current state
  const rows = await db`SELECT live_value FROM site_content WHERE key = 'inventory_password_hash'`;
  console.log("Current hash exists:", rows.length > 0);

  // Clear it
  await db`DELETE FROM site_content WHERE key = 'inventory_password_hash'`;

  // Set the password directly with a known good value
  const password = "$Millstadtinventory3935!";
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  const stored = `${salt}:${hash}`;

  await db`INSERT INTO site_content (key, live_value, updated_at) VALUES ('inventory_password_hash', ${stored}, NOW())`;

  console.log("Password reset to: $Millstadtinventory3935!");
  console.log("Hash stored successfully.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
