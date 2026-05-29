import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tiny endpoint the installed PWA polls to detect whether a newer build
 * is available. Returns the current Vercel deployment SHA. The lounge
 * shell compares the cached value and forces a reload when it changes.
 */
export async function GET() {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    "dev";
  return NextResponse.json({ sha, builtAt: new Date().toISOString() });
}
