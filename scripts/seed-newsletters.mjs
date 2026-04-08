/**
 * Seeds Jan/Feb/March 2026 Commercial Club newsletters into Vercel Blob
 * by fetching directly from millstadtchamber.org.
 *
 * Run: node --env-file=.env.local scripts/seed-newsletters.mjs
 */

import { put } from "@vercel/blob";

const CHAMBER_BASE = "https://millstadtchamber.org";
const MONTHS = ["january", "february", "march"];
const YEAR   = "2026";

console.log("Fetching newsletter listing from millstadtchamber.org…");
const pageRes = await fetch(`${CHAMBER_BASE}/monthly-newsletters`, {
  headers: { "User-Agent": "MillstadtEMS/1.0 (millstadtems.org)" },
});
if (!pageRes.ok) throw new Error(`Chamber site returned ${pageRes.status}`);
const html = await pageRes.text();
console.log(`Got ${html.length} chars of HTML\n`);

for (const month of MONTHS) {
  const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
  console.log(`${capMonth} ${YEAR}:`);

  // Find the PDF link
  const pattern = new RegExp(`href="(/s/[^"]*${capMonth}-${YEAR}-Newsletter[^"]*\\.pdf)"`, "i");
  const match   = html.match(pattern);
  if (!match) { console.log("  ✗ Not found on Chamber site\n"); continue; }

  const pdfUrl = `${CHAMBER_BASE}${match[1]}`;
  console.log(`  Source: ${pdfUrl}`);

  // Download
  const pdfRes = await fetch(pdfUrl, {
    headers: { "User-Agent": "MillstadtEMS/1.0 (millstadtems.org)" },
  });
  if (!pdfRes.ok) { console.log(`  ✗ Download failed: ${pdfRes.status}\n`); continue; }
  const buf = await pdfRes.arrayBuffer();
  console.log(`  Downloaded: ${(buf.byteLength / 1024).toFixed(0)} KB`);

  // Upload to Vercel Blob
  const blobPath = `commercial-club/${YEAR}/${month}_newsletter.pdf`;
  const blob = await put(blobPath, buf, {
    access: "public",
    allowOverwrite: true,
    contentType: "application/pdf",
  });

  console.log(`  ✓ Live at: ${blob.url}\n`);
}

console.log("Done.");
