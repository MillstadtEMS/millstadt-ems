/**
 * GET /api/cron/fetch-newsletters
 * Called by Vercel Cron once daily. Checks if the current month's Commercial
 * Club newsletter is already stored; if not, fetches it from millstadtchamber.org
 * and saves it to Vercel Blob.
 *
 * Protected by CRON_SECRET — Vercel passes it via Authorization header automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";

const CHAMBER_BASE        = "https://millstadtchamber.org";
const CHAMBER_NEWSLETTERS = `${CHAMBER_BASE}/monthly-newsletters`;

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or a trusted caller)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Work out current month/year in Chicago time
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const month = now.toLocaleString("en-US", { month: "long", timeZone: "America/Chicago" }).toLowerCase();
  const year  = String(now.getFullYear());
  const blobPath = `commercial-club/${year}/${month}_newsletter.pdf`;

  // Skip if we already have this month's file
  try {
    const { blobs } = await list({ prefix: blobPath });
    if (blobs.length > 0) {
      return NextResponse.json({ skipped: true, reason: "Already have this month", month, year });
    }
  } catch {
    // list() failure is non-fatal — continue and try to fetch
  }

  // Fetch the newsletter listing page
  let html: string;
  try {
    const res = await fetch(CHAMBER_NEWSLETTERS, {
      headers: { "User-Agent": "MillstadtEMS/1.0 (millstadtems.org)" },
    });
    if (!res.ok) throw new Error(`Chamber site returned ${res.status}`);
    html = await res.text();
  } catch (err) {
    return NextResponse.json({ error: `Chamber site unreachable: ${String(err)}` }, { status: 502 });
  }

  // Find the PDF link for this month
  const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
  const pattern  = new RegExp(`href="(/s/[^"]*${capMonth}-${year}-Newsletter[^"]*\\.pdf)"`, "i");
  const match    = html.match(pattern);

  if (!match) {
    // Not posted yet — normal for early in the month, not an error
    return NextResponse.json({ found: false, month, year, message: "Not posted yet on Chamber site" });
  }

  const pdfUrl = `${CHAMBER_BASE}${match[1]}`;

  // Download and store
  try {
    const pdfRes = await fetch(pdfUrl, {
      headers: { "User-Agent": "MillstadtEMS/1.0 (millstadtems.org)" },
    });
    if (!pdfRes.ok) throw new Error(`PDF download returned ${pdfRes.status}`);
    const buf = await pdfRes.arrayBuffer();

    const blob = await put(blobPath, buf, {
      access: "public",
      allowOverwrite: true,
      contentType: "application/pdf",
    });

    return NextResponse.json({ ok: true, month, year, url: blob.url });
  } catch (err) {
    return NextResponse.json({ error: `Download/upload failed: ${String(err)}` }, { status: 502 });
  }
}
