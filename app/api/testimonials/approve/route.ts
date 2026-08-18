import { NextRequest, NextResponse } from "next/server";
import { verifySignedToken } from "@/lib/email";

const VALID_ACTIONS = ["approve", "deny", "delete"] as const;
type Action = typeof VALID_ACTIONS[number];
const TESTIMONIAL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id     = searchParams.get("id");
  const action = searchParams.get("action") as Action | null;
  const sig    = searchParams.get("sig");

  if (!id || !TESTIMONIAL_ID.test(id) || !action || !sig || !VALID_ACTIONS.includes(action)) {
    return new NextResponse("Invalid request.", { status: 400 });
  }

  if (!verifySignedToken(id, action, sig)) {
    return new NextResponse("Invalid link.", { status: 403 });
  }

  const reviewUrl = new URL("/admin/testimonials", req.url);
  reviewUrl.searchParams.set("review", id);
  reviewUrl.searchParams.set("legacy", "1");
  const response = NextResponse.redirect(reviewUrl, 303);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
