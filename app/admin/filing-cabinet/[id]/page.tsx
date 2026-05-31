/**
 * /admin/filing-cabinet/[id]
 *
 * Originally a separate read-only summary view. The agency's intent
 * was for the Filing Cabinet to drill straight into each person's
 * full editable employee record (which lives at /admin/employees/[id]
 * with InlineField editors, photo upload, certs, attachments, classes,
 * writeups, forms, etc.), so this route now redirects there.
 *
 * Direct links + bookmarks to /admin/filing-cabinet/<id> continue to
 * work — they just land on the real editor instead of a parallel
 * read-only view.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FilingCabinetEmployeeRedirect(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  redirect(`/admin/employees/${id}`);
}
