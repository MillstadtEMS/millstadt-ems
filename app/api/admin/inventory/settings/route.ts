import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { changeInventoryPassword } from "@/lib/inventory/auth";
import { logChange } from "@/lib/db";
import { sendInventoryEmail } from "@/lib/inventory/email";

export async function PATCH(req: NextRequest) {
  const authed = await isAdminAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    await changeInventoryPassword(newPassword);
    await logChange("password_change", "inventory", `Inventory password changed at ${new Date().toISOString()}`);

    try {
      await sendInventoryEmail({
        type: "password_change",
        submittedBy: "Admin",
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true, message: "Password updated. All inventory sessions invalidated." });
  } catch (e) {
    console.error("Password change error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
