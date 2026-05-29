import { redirect } from "next/navigation";
import Link from "next/link";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { href: "/admin/classes",      label: "Employee Classes / Roles", description: "BLS, ALS, Critical Care, Board of Directors, etc. Drives which certifications each class must hold." },
  { href: "/admin/cert-types",   label: "Certification Types",      description: "Built-in + custom certs with alert thresholds. Tie to classes to make them mandatory." },
  { href: "/admin/calls",        label: "Call Log Editor",          description: "Edit the CAD call ticker entries on the homepage." },
  { href: "/admin/applicants",   label: "Applicants",               description: "Hiring pipeline + workflow." },
  { href: "/admin/submissions",  label: "Form Submissions",         description: "Contact forms, scholarships, applications." },
  { href: "/admin/visual-editor",label: "Visual Editor",            description: "Edit headings, hero copy, leadership titles, etc." },
  { href: "/admin/media",        label: "Media Manager",            description: "Replace photos used across the website." },
];

export default async function WebsiteConfigPage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (!session.isAdmin) redirect("/lounge");
  const emp = await getEmployee(session.id);

  const me = {
    firstName: session.firstName,
    lastName: session.lastName,
    certification: emp?.certification ?? null,
    photoUrl: emp?.photoUrl ?? null,
    isAdmin: session.isAdmin,
  };

  return (
    <LoungeShell me={me}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Admin
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>Website Configuration</h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4 }}>
          Manage classes, certs, the public call ticker, applicants, and visual content.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            style={{
              display: "block",
              background: "#071428",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "20px 22px",
              textDecoration: "none",
              color: "white",
            }}
          >
            <div style={{ color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Configure
            </div>
            <div style={{ fontWeight: 900, fontSize: 17, marginTop: 6 }}>{s.label}</div>
            <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{s.description}</p>
          </Link>
        ))}
      </div>
    </LoungeShell>
  );
}
