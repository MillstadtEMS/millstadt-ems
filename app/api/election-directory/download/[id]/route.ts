import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hasElectionAccess } from "@/lib/election-review";
import directory from "@/data/election-directory/directory.json";
export const runtime = "nodejs";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
  if (!await hasElectionAccess()) return new Response("Review password required.", { status: 401, headers });
  const { id } = await params;
  const group = directory.groups.find(g => g.id === id);
  if (!group) return new Response("Not found.", { status: 404, headers });
  const file = await readFile(join(process.cwd(), "data/election-directory/downloads", `${group.id}.xlsx`));
  const filename = `${group.name.replace(/[^a-z0-9-]+/gi, "-")}-EMS-taxes.xlsx`;
  return new Response(file, { headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"` } });
}
