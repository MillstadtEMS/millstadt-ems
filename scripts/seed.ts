import { seedFromWorkbook } from "../lib/inventory/seed";

async function main() {
  console.log("Seeding inventory from Excel...");
  const result = await seedFromWorkbook();
  console.log(`Done! Seeded ${result.items} items in ${result.categories} categories.`);
  process.exit(0);
}

main().catch(e => {
  console.error("Seed failed:", e);
  process.exit(1);
});
