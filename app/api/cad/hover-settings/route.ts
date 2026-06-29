import { NextResponse } from "next/server";
import { getHoverSettings } from "@/lib/cad/settings";

export const runtime = "nodejs";
export const revalidate = 0; // always fresh

/** Public: the call ticker reads this to know which hover-box fields to show. */
export async function GET() {
  return NextResponse.json(await getHoverSettings());
}
