/**
 * Test script — fetches Jan/Feb/March 2026 newsletters from millstadtchamber.org
 * and saves them to /tmp so we can verify the fetch logic works.
 *
 * Run: node scripts/fetch-chamber-newsletters.mjs
 */

import { writeFileSync } from "fs";

const CHAMBER_BASE = "https://millstadtchamber.org";
const MONTHS = ["january", "february", "march"];
const YEAR   = "2026";

async function fetchNewsletterPage() {
  console.log("Fetching newsletter listing from millstadtchamber.org…");
  const res = await fetch(`${CHAMBER_BASE}/monthly-newsletters`, {
    headers: { "User-Agent": "MillstadtEMS/1.0 (millstadtems.org)" },
  });
  if (!res.ok) throw new Error(`Chamber site returned ${res.status}`);
  return res.text();
}

function findPdfUrl(html, month, year) {
  const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
  const pattern  = new RegExp(
    `href="(/s/[^"]*${capMonth}-${year}-Newsletter[^"]*\\.pdf)"`,
    "i"
  );
  const match = html.match(pattern);
  return match ? `${CHAMBER_BASE}${match[1]}` : null;
}

async function downloadPdf(url, month) {
  console.log(`  Downloading: ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "MillstadtEMS/1.0 (millstadtems.org)" },
  });
  if (!res.ok) throw new Error(`PDF download returned ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = `/tmp/commercial-club-${month}-${YEAR}.pdf`;
  writeFileSync(outPath, buf);
  console.log(`  ✓ Saved to ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  return outPath;
}

const html = await fetchNewsletterPage();
console.log(`  Got ${html.length} chars of HTML\n`);

for (const month of MONTHS) {
  const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
  console.log(`${capMonth} ${YEAR}:`);
  const url = findPdfUrl(html, month, YEAR);
  if (!url) {
    console.log(`  ✗ No PDF found for ${capMonth} ${YEAR}\n`);
    continue;
  }
  try {
    await downloadPdf(url, month);
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
  }
  console.log();
}

console.log("Done. Check /tmp/ for the downloaded PDFs.");
