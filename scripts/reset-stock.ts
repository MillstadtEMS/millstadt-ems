import { neon } from "@neondatabase/serverless";

async function main() {
  const db = neon(process.env.DATABASE_URL!);
  await db`UPDATE inventory_items SET current_stock = 0, prior_stock = NULL, expired_qty = 0`;
  const r = await db`SELECT COUNT(*)::int AS cnt FROM inventory_items`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log("Reset stock to 0 for", (r as any[])[0].cnt, "items");
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
