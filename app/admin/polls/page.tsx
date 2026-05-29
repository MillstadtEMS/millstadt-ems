import Link from "next/link";
import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { listPolls } from "@/lib/lounge/polls";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KIND_LABEL = {
  single_choice: "Pick one",
  multi_choice: "Pick many",
  free_text: "Open-ended",
} as const;

export default async function AdminPollsPage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (!session.isAdmin) redirect("/lounge");
  const polls = await listPolls();

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Admin
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Polls & Surveys
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4, lineHeight: 1.55 }}>
          Get crew opinions with a one-shot poll. Each employee can respond once;
          you see the aggregate counts and (optionally) per-person responses.
        </p>
      </header>

      <div style={{ marginBottom: 14 }}>
        <Link
          href="/admin/polls/new"
          style={{ display: "inline-block", padding: "10px 18px", background: "#f0b429", color: "#040d1a", borderRadius: 12, fontWeight: 900, fontSize: 13, letterSpacing: "0.10em", textTransform: "uppercase", textDecoration: "none" }}
        >
          + New Poll
        </Link>
      </div>

      {polls.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: 14 }}>No polls yet — create one to start collecting answers.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {polls.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/polls/${p.id}`}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 16px", background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, color: "white", textDecoration: "none" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.title}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>
                    {KIND_LABEL[p.kind]} · created by {p.createdBy.firstName} {p.createdBy.lastName}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#f0b429" }}>
                    {p.responseCount} / {p.totalEligible}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.10em", textTransform: "uppercase", marginTop: 2 }}>
                    {p.open ? "Open" : "Closed"}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
