import { NextRequest, NextResponse } from "next/server";
import { isInventoryAuthedFromRequest } from "@/lib/inventory/auth";
import { createSubmission } from "@/lib/inventory/db";
import { sendInventoryEmail } from "@/lib/inventory/email";
import { currentEmployee } from "@/lib/lounge/auth";

export async function POST(req: NextRequest) {
  const authed = await isInventoryAuthedFromRequest(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { categorySlug, itemsUpdated, notes } = body;

    // Auto-stamp the logged-in lounge employee. Client cannot spoof
    // submittedBy when a lounge session is present — server decides.
    const me = await currentEmployee();
    const submittedBy = me
      ? `${me.firstName} ${me.lastName}`
      : body.submittedBy ?? "inventory";

    const submission = await createSubmission({
      submittedBy,
      categorySlug,
      itemsUpdated: itemsUpdated ?? 0,
      notes,
    });

    // Send email notification
    try {
      await sendInventoryEmail({
        type: "inventory_submission",
        submissionId: submission.id,
        categorySlug,
        itemsUpdated: itemsUpdated ?? 0,
        notes,
        submittedBy,
      });
    } catch (emailErr) {
      console.error("Email send error (non-fatal):", emailErr);
    }

    return NextResponse.json({ ok: true, submission });
  } catch (e) {
    console.error("Submit error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
