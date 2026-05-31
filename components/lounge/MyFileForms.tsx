"use client";

/**
 * Standalone forms-only panel on /lounge/my-file. Lists finalized
 * forms an admin has marked employee-visible. Reads from
 * /api/lounge/forms, which already gates confidential records.
 *
 * Renders nothing until mounted (hydration-safe; same pattern the
 * homepage stats use).
 */

import { useCallback, useEffect, useState } from "react";

interface FormSummary {
  id: string;
  formType: string;
  formLabel: string;
  status: "draft" | "finalized" | "rescinded";
  finalizedAt: string | null;
  pdfUrl: string | null;
  pdfFilename: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function MyFileForms() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<FormSummary[] | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/lounge/forms", { cache: "no-store" });
      if (!r.ok) { setItems([]); return; }
      const d = await r.json();
      const visible: FormSummary[] = Array.isArray(d.visible) ? d.visible : [];
      // Newest finalized first.
      visible.sort((a, b) => (b.finalizedAt ?? "").localeCompare(a.finalizedAt ?? ""));
      setItems(visible);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => { setMounted(true); load(); }, [load]);

  if (!mounted) return null;
  if (items === null) {
    return (
      <section style={card}>
        <div style={skeleton} />
      </section>
    );
  }
  if (items.length === 0) return null;

  // Group by form type so the list reads as folders of documents.
  const byType = new Map<string, FormSummary[]>();
  for (const f of items) {
    if (!byType.has(f.formLabel)) byType.set(f.formLabel, []);
    byType.get(f.formLabel)!.push(f);
  }

  return (
    <section style={card}>
      <header style={{ marginBottom: 14 }}>
        <div style={kicker}>Personnel file</div>
        <h2 style={heading}>Forms & documents on file</h2>
        <p style={lede}>
          Signed records leadership has shared with you. Tap any item to open the PDF.
        </p>
      </header>

      <div style={{ display: "grid", gap: 14 }}>
        {Array.from(byType.entries()).map(([label, group]) => (
          <div key={label}>
            <div style={groupLabel}>{label}</div>
            <ul style={list}>
              {group.map((f) => (
                <li key={f.id}>
                  {f.pdfUrl ? (
                    <a
                      href={f.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={row}
                    >
                      <span style={{ flex: 1, color: "white", fontWeight: 700, fontSize: 14 }}>
                        {f.pdfFilename ?? f.formLabel}
                      </span>
                      <span style={{ color: "#94a3b8", fontSize: 12, marginRight: 12 }}>
                        Signed {fmtDate(f.finalizedAt)}
                      </span>
                      <span style={chip}>Open PDF</span>
                    </a>
                  ) : (
                    <div style={row}>
                      <span style={{ flex: 1, color: "white", fontWeight: 700, fontSize: 14 }}>
                        {f.formLabel}
                      </span>
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>
                        Signed {fmtDate(f.finalizedAt)}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

const card: React.CSSProperties = {
  marginBottom: 16,
  padding: 20,
  background: "rgba(7,20,40,0.55)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};
const kicker: React.CSSProperties = {
  color: "#f0b429",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
};
const heading: React.CSSProperties = {
  color: "white",
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: "-0.015em",
  margin: "4px 0 6px",
};
const lede: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: 13.5,
  lineHeight: 1.55,
  margin: 0,
};
const groupLabel: React.CSSProperties = {
  color: "#f0b429",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  marginBottom: 6,
  fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
};
const list: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: 6,
};
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  textDecoration: "none",
  color: "#cbd5e1",
};
const chip: React.CSSProperties = {
  padding: "5px 10px",
  background: "#f0b429",
  color: "#040d1a",
  fontWeight: 900,
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  borderRadius: 8,
};
const skeleton: React.CSSProperties = {
  height: 16,
  width: "60%",
  background: "rgba(255,255,255,0.08)",
  borderRadius: 6,
};
