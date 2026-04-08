/**
 * POST /api/admin/commercial-club/fetch
 * Fetches the newsletter PDF for the given month/year from the Millstadt
 * Chamber of Commerce website and stores it in Vercel Blob.
 * Body: { month: "april", year: "2026" }
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

const CHAMBER_NEWSLETTERS = "https://millstadtchamber.org/monthly-newsletters";
const CHAMBER_BASE        = "https://millstadtchamber.org";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { month, year } = await req.json() as { month: string; year: string };
  if (!month || !year) {
    return NextResponse.json({ error: "Missing month or year" }, { status: 400 });
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
    return NextResponse.json(
      { error: `Could not reach the Chamber website: ${String(err)}` },
      { status: 502 },
    );
  }

  // Find the PDF link for this month/year
  // Pattern: /s/Millstadt-Chamber-of-Commerce-{Month}-{Year}-Newsletter[...].pdf
  const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
  // Match any PDF link that contains "{Month}-{Year}-Newsletter"
  const pattern = new RegExp(
    `href="(/s/[^"]*${capMonth}-${year}-Newsletter[^"]*\\.pdf)"`,
    "i",
  );
  const match = html.match(pattern);

  if (!match) {
    return NextResponse.json(
      { error: `No newsletter found for ${capMonth} ${year} on the Chamber website.` },
      { status: 404 },
    );
  }

  const pdfPath = match[1];
  const pdfUrl  = `${CHAMBER_BASE}${pdfPath}`;

  // Download the PDF
  let pdfBuffer: ArrayBuffer;
  try {
    const pdfRes = await fetch(pdfUrl, {
      headers: { "User-Agent": "MillstadtEMS/1.0 (millstadtems.org)" },
    });
    if (!pdfRes.ok) throw new Error(`PDF download returned ${pdfRes.status}`);
    pdfBuffer = await pdfRes.arrayBuffer();
  } catch (err) {
    return NextResponse.json(
      { error: `Could not download the PDF: ${String(err)}` },
      { status: 502 },
    );
  }

  // Store in Vercel Blob (same path as manual upload)
  const blob = await put(
    `commercial-club/${year}/${month}_newsletter.pdf`,
    pdfBuffer,
    { access: "public", allowOverwrite: true, contentType: "application/pdf" },
  );

  return NextResponse.json({ ok: true, url: blob.url, source: pdfUrl });
}
