/**
 * /inventory — main landing menu. Wrapped in LoungeShell when the
 * caller has a valid lounge session so the sidebar + mobile bottom-tab
 * bar stay visible at the entry point (per user request). Inner forms
 * /inventory/backstock, /inventory/state, etc. continue to render bare
 * so the long item lists aren't squeezed by the sidebar.
 */
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import InventoryMenuClient from "@/components/InventoryMenuClient";

export const dynamic = "force-dynamic";

export default async function InventoryMenuPage() {
  const session = await currentEmployee();
  const row = session ? await getEmployee(session.id) : null;
  const me = session
    ? {
        firstName: session.firstName,
        lastName: session.lastName,
        certification: row?.certification ?? null,
        photoUrl: row?.photoUrl ?? null,
        isAdmin: session.isAdmin,
      }
    : null;
  return me ? (
    <LoungeShell me={me}>
      <InventoryMenuClient />
    </LoungeShell>
  ) : (
    <InventoryMenuClient />
  );
}
