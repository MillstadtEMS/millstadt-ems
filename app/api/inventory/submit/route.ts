import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isInventoryAuthedFromRequest } from "@/lib/inventory/auth";
import { createSubmission, getItems } from "@/lib/inventory/db";
import { sendInventoryEmail, sendInventoryOrderEmail } from "@/lib/inventory/email";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";

export async function POST(req: NextRequest) {
  const authed = await isInventoryAuthedFromRequest(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { categorySlug, itemsUpdated, notes, signature, purpose } = body;

    // Require a signature on every interactive submission — PCR-style.
    // QR-scan batch submissions are signature-less by design (the scanner
    // already signs each individual item update; this call is the email
    // notification summary).
    const isQrBatch = body.submittedBy === "QR Scanner";
    const sigOk = typeof signature === "string" && signature.startsWith("data:image/");
    if (!isQrBatch && !sigOk) {
      return NextResponse.json({ error: "Signature required" }, { status: 400 });
    }

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

    // Persist the signature in lounge_signatures (linked to the lounge
    // employee if we have one, with the inventory submission id as the
    // reference_id).
    if (sigOk) {
      try {
        const db = sql();
        await db`
          INSERT INTO lounge_signatures
            (id, employee_id, purpose, reference_id, image_data_url)
          VALUES
            (${randomUUID()}, ${me?.id ?? null},
             ${typeof purpose === "string" ? purpose : "inventory"},
             ${String(submission.id)}, ${signature})
        `;
      } catch (sigErr) {
        console.error("Signature persist error (non-fatal):", sigErr);
      }
    }

    // Send email notification (summary) — keep the existing alert.
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

    // Send the actual order as a complete PDF. This is the whole point of
    // the order workflow — every backstock item below par, grouped by
    // category, with quantities. We email the *full* backstock order (all
    // categories), not just the one submitted, so it always has everything.
    // QR-batch submissions skip this (they're per-item recommendations).
    if (!isQrBatch) {
      try {
        const allBackstock = await getItems(undefined, "backstock");
        await sendInventoryOrderEmail(allBackstock, {
          submittedBy,
          submittedDate: new Date(),
        });
      } catch (orderErr) {
        console.error("Order PDF email error (non-fatal):", orderErr);
      }
    }

    return NextResponse.json({ ok: true, submission });
  } catch (e) {
    console.error("Submit error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
