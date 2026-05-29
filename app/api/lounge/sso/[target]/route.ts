import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  makeSessionToken as makeTruckCheckToken,
  sessionCookieOptions as truckCheckCookieOptions,
} from "@/lib/truckcheck/auth";
import {
  makeInventorySessionToken,
  inventoryCookieOptions,
} from "@/lib/inventory/auth";

export const dynamic = "force-dynamic";

const TARGETS: Record<string, string> = {
  truckcheck: "/truckcheck",
  inventory: "/inventory",
};

/**
 * Lounge → Truck Check / Inventory SSO bridge.
 *
 * When a logged-in lounge user clicks the sidebar link for Truck Check or
 * Inventory, the browser hits /api/lounge/sso/<target>. We verify the lounge
 * cookie, mint the destination's own native session cookie, and redirect
 * straight to the destination page. The destination then sees its own
 * cookie and renders without bouncing to its login page.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ target: string }> }) {
  const { target } = await ctx.params;
  const destination = TARGETS[target];
  if (!destination) {
    return NextResponse.json({ error: "Unknown SSO target" }, { status: 404 });
  }

  const emp = await currentEmployee();
  if (!emp || !emp.isActive) {
    const next = encodeURIComponent(`/api/lounge/sso/${target}`);
    return NextResponse.redirect(new URL(`/lounge/login?next=${next}`, req.url));
  }

  const res = NextResponse.redirect(new URL(destination, req.url));

  if (target === "truckcheck") {
    const token = makeTruckCheckToken();
    const opts = truckCheckCookieOptions(token);
    res.cookies.set(opts.name, opts.value, {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      maxAge: opts.maxAge,
      path: opts.path,
    });
  } else if (target === "inventory") {
    const token = await makeInventorySessionToken();
    const opts = inventoryCookieOptions(token);
    res.cookies.set(opts.name, opts.value, {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      maxAge: opts.maxAge,
      path: opts.path,
    });
  }

  return res;
}
