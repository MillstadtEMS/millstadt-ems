import { NextRequest, NextResponse } from "next/server";
import { isInventoryAuthed } from "@/lib/inventory/auth";
import { createSubmission } from "@/lib/inventory/db";
import { sendInventoryEmail } from "@/lib/inventory/email";

export async function POST(req: NextRequest) {
  const authed = await isInventoryAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { categorySlug, itemsUpdated, notes, submittedBy } = await req.json();

    const submission = await createSubmission({
      submittedBy: submittedBy ?? "inventory",
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
        submittedBy: submittedBy ?? "Inventory User",
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
