/**
 * Admin-trigger for the CAD poll. Lets a logged-in admin force a Gmail
 * fetch from /admin/calls without needing the CAD_POLL_SECRET in the
 * browser. We just call /api/cad/poll server-side with the secret.
 */

import { NextResponse } from "next/server";
import { requireTickerEditor } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const denied = await requireTickerEditor(); if (denied) return denied;

  const secret = process.env.CAD_POLL_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CAD_POLL_SECRET not configured." }, { status: 500 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://millstadtems.org";
  try {
    const r = await fetch(`${base}/api/cad/poll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json({ error: data.error || `Poll failed (${r.status})` }, { status: 502 });
    }
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error("[admin/cad-poll]", e);
    return NextResponse.json({ error: "Could not reach the CAD poller. Try again in a moment." }, { status: 502 });
  }
}
