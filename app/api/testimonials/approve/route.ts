import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/email";
import { setStatus } from "@/lib/testimonials";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const action = searchParams.get("action");
  const sig = searchParams.get("sig");

  if (!id || !action || !sig || (action !== "approve" && action !== "deny")) {
    return new NextResponse("Invalid request.", { status: 400 });
  }

  if (sig !== signToken(id, action)) {
    return new NextResponse("Invalid or expired link.", { status: 403 });
  }

  const status = action === "approve" ? "approved" : "denied";
  const ok = await setStatus(id, status);

  const color = status === "approved" ? "#22c55e" : "#ef4444";
  const emoji = status === "approved" ? "✓" : "✕";
  const label = status === "approved" ? "Approved" : "Denied";

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head><title>Testimonial ${label}</title></head>
      <body style="font-family:system-ui,sans-serif;background:#040d1a;color:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
        <div style="text-align:center;padding:60px 40px;">
          <div style="font-size:64px;margin-bottom:16px;">${emoji}</div>
          <h1 style="color:${color};font-size:32px;font-weight:900;margin:0 0 12px;">${ok ? label : "Already Processed"}</h1>
          <p style="color:#64748b;font-size:16px;margin:0;">
            ${ok ? `The testimonial has been ${status}.` : "This testimonial has already been reviewed."}
          </p>
          <a href="https://millstadtems.org/testimonials" style="display:inline-block;margin-top:32px;color:#f0b429;font-size:14px;">View Testimonials →</a>
        </div>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html" }, status: 200 }
  );
}
