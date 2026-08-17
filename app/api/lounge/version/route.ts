import { NextResponse } from "next/server";
import { SITE_BUILD_REVISION, SITE_DISPLAY_VERSION, SITE_VERSION } from "@/lib/site-version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tiny endpoint the installed PWA polls to detect whether a newer build
 * is available. Returns the public site version and current deployment SHA.
 * The lounge shell compares the cached SHA and reloads when it changes.
 */
export async function GET() {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    "dev";
  return NextResponse.json({
    version: SITE_VERSION,
    build: SITE_BUILD_REVISION,
    displayVersion: SITE_DISPLAY_VERSION,
    sha,
    builtAt: new Date().toISOString(),
  });
}
