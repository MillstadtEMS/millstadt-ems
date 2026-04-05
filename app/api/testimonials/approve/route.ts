import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/email";
import { setStatus, deleteTestimonial } from "@/lib/testimonials";

const VALID_ACTIONS = ["approve", "deny", "delete"] as const;
type Action = typeof VALID_ACTIONS[number];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id     = searchParams.get("id");
  const action = searchParams.get("action") as Action | null;
  const sig    = searchParams.get("sig");

  if (!id || !action || !sig || !VALID_ACTIONS.includes(action)) {
    return new NextResponse("Invalid request.", { status: 400 });
  }

  if (sig !== signToken(id, action)) {
    return new NextResponse("Invalid link.", { status: 403 });
  }

  let ok: boolean;
  let label: string;
  let color: string;
  let emoji: string;
  let detail: string;

  if (action === "delete") {
    ok     = await deleteTestimonial(id);
    label  = ok ? "Deleted" : "Not Found";
    color  = "#94a3b8";
    emoji  = "🗑";
    detail = ok ? "The testimonial has been permanently deleted." : "This testimonial was not found — it may have already been deleted.";
  } else {
    const status = action === "approve" ? "approved" : "denied";
    ok     = await setStatus(id, status);
    label  = status === "approved" ? "Approved" : "Denied";
    color  = status === "approved" ? "#22c55e" : "#ef4444";
    emoji  = status === "approved" ? "✓" : "✕";
    detail = ok
      ? `The testimonial has been ${status}.`
      : "This testimonial has already been reviewed.";
  }

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head><title>Testimonial ${label}</title></head>
      <body style="font-family:system-ui,sans-serif;background:#040d1a;color:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
        <div style="text-align:center;padding:60px 40px;">
          <div style="font-size:64px;margin-bottom:16px;">${emoji}</div>
          <h1 style="color:${color};font-size:32px;font-weight:900;margin:0 0 12px;">${label}</h1>
          <p style="color:#64748b;font-size:16px;margin:0;">${detail}</p>
          <a href="https://millstadtems.org/testimonials" style="display:inline-block;margin-top:32px;color:#f0b429;font-size:14px;">View Testimonials →</a>
        </div>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html" }, status: 200 }
  );
}
