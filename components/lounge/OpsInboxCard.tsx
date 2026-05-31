"use client";

/**
 * Admin Ops Inbox — pulled out of the left sidebar and re-hosted on
 * the right rail of /lounge (The Wall) so the sidebar can stay tight.
 * Same data + visual language as the old SidebarPulse — just lives
 * next to the daily-ops widgets instead of competing with the nav.
 *
 * Polls the same admin endpoints LoungeShell already uses every 30s
 * (and on tab-visibility flips) so the counts stay in sync with
 * SidebarPulse / nav badges without any shared state.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface SubmissionCategory {
  formType: string;
  unread?: number;
}

interface OpsBadges {
  submissions: number;
  applications: number;
  visits: number;
  birthdayRequests: number;
  formRequests: number;
  profileRequests: number;
  birthdays: number;
}

const EMPTY: OpsBadges = {
  submissions: 0, applications: 0, visits: 0, birthdayRequests: 0,
  formRequests: 0, profileRequests: 0, birthdays: 0,
};

function isApplicationSubmission(t: string) {
  return /(?:employment|application|job|hiring)/i.test(t);
}
function isVisitSubmission(t: string) {
  return /(?:visit|ride[-_ ]?along|tour|event|appearance)/i.test(t);
}
function isBirthdaySubmission(t: string) {
  return /birthday/i.test(t);
}

export default function OpsInboxCard() {
  const [badges, setBadges] = useState<OpsBadges>(EMPTY);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    async function getJson<T>(url: string): Promise<T | null> {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) return null;
        return (await r.json()) as T;
      } catch { return null; }
    }
    async function refresh() {
      const [sData, frData, prData, bData] = await Promise.all([
        getJson<SubmissionCategory[] | { categories?: SubmissionCategory[] }>("/api/admin/submissions"),
        getJson<{ requests?: unknown[] }>("/api/admin/form-requests?status=pending"),
        getJson<{ requests?: unknown[] }>("/api/admin/profile-change-requests"),
        getJson<{ count?: number; people?: unknown[] }>("/api/lounge/birthdays/today"),
      ]);
      if (cancelled) return;
      const categories = Array.isArray(sData)
        ? sData
        : !Array.isArray(sData) && Array.isArray(sData?.categories) ? sData.categories : [];
      setBadges({
        submissions:      categories.reduce((s, c) => s + (Number(c.unread) || 0), 0),
        applications:     categories.filter((c) => isApplicationSubmission(c.formType)).reduce((s, c) => s + (Number(c.unread) || 0), 0),
        visits:           categories.filter((c) => isVisitSubmission(c.formType)).reduce((s, c) => s + (Number(c.unread) || 0), 0),
        birthdayRequests: categories.filter((c) => isBirthdaySubmission(c.formType)).reduce((s, c) => s + (Number(c.unread) || 0), 0),
        formRequests:     Array.isArray(frData?.requests) ? frData.requests.length : 0,
        profileRequests:  Array.isArray(prData?.requests) ? prData.requests.length : 0,
        birthdays:        typeof bData?.count === "number" ? bData.count : Array.isArray(bData?.people) ? bData.people.length : 0,
      });
    }
    refresh();
    const id = setInterval(refresh, 30_000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!mounted) return null;

  const items: { label: string; value: number; href: string; tone: "gold" | "green" | "cyan" | "pink" }[] = [
    { label: "New submissions",   value: badges.submissions,       href: "/admin/submissions",                                          tone: "gold"  },
    { label: "Applications",      value: badges.applications,      href: "/admin/submissions?type=Employment%20Application",            tone: "green" },
    { label: "Visit requests",    value: badges.visits,            href: "/admin/submissions",                                          tone: "cyan"  },
    { label: "Birthday requests", value: badges.birthdayRequests,  href: "/admin/submissions",                                          tone: "pink"  },
    { label: "Form approvals",    value: badges.formRequests,      href: "/admin/forms",                                                tone: "gold"  },
    { label: "Profile edits",     value: badges.profileRequests,   href: "/admin/employees",                                            tone: "cyan"  },
    { label: "Birthdays today",   value: badges.birthdays,         href: "/lounge",                                                     tone: "green" },
  ];

  const pulseTotal = badges.submissions + badges.formRequests + badges.profileRequests + badges.birthdays;
  const hasAction = items.some((i) => i.value > 0);

  return (
    <section
      aria-label="Operations inbox"
      className="mas-rail-card"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(145deg, rgba(12,35,64,0.82), rgba(2,9,18,0.92))",
        border: `1px solid ${hasAction ? "rgba(240,180,41,0.22)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: hasAction
          ? "0 14px 34px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "0 auto 0 0",
          width: 3,
          background: hasAction
            ? "linear-gradient(180deg, #f0b429, #7dd3fc)"
            : "rgba(148,163,184,0.22)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div>
          <div className="mas-mono" style={{ color: "#f0b429", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Ops Inbox
          </div>
          <div className="mas-display" style={{ color: "white", fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {hasAction ? "Needs eyes" : "All quiet"}
          </div>
        </div>
        <span
          className="mas-numeric"
          style={{
            minWidth: 36, height: 32,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            borderRadius: 999,
            background: hasAction ? "rgba(240,180,41,0.16)" : "rgba(148,163,184,0.10)",
            border: hasAction ? "1px solid rgba(240,180,41,0.35)" : "1px solid rgba(148,163,184,0.16)",
            color: hasAction ? "#f0b429" : "#94a3b8",
            fontSize: 15, fontWeight: 800,
          }}
        >
          {pulseTotal}
        </span>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {items.map((item) => (
          <OpsLink key={`${item.label}-${item.href}`} {...item} />
        ))}
      </div>
    </section>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function OpsLink({
  label, value, href, tone,
}: {
  label: string; value: number; href: string; tone: "gold" | "green" | "cyan" | "pink";
}) {
  const color = tone === "green" ? "#34d399" : tone === "cyan" ? "#7dd3fc" : tone === "pink" ? "#f9a8d4" : "#f0b429";
  const active = value > 0;
  return (
    <Link
      href={href}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 10,
        minHeight: 34,
        padding: "7px 10px",
        borderRadius: 10,
        textDecoration: "none",
        background: active ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.025)",
        border: active ? `1px solid ${hexToRgba(color, 0.34)}` : "1px solid rgba(255,255,255,0.055)",
        color: active ? "white" : "#94a3b8",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span
          aria-hidden
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: active ? color : "rgba(148,163,184,0.36)",
            boxShadow: active ? `0 0 14px ${hexToRgba(color, 0.68)}` : "none",
            flexShrink: 0,
          }}
        />
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5, fontWeight: 700 }}>
          {label}
        </span>
      </span>
      <span
        className="mas-numeric"
        style={{
          minWidth: 24, height: 22, padding: "0 7px",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          borderRadius: 999,
          background: active ? hexToRgba(color, 0.18) : "rgba(255,255,255,0.06)",
          border: active ? `1px solid ${hexToRgba(color, 0.36)}` : "1px solid rgba(255,255,255,0.08)",
          color: active ? color : "#94a3b8",
          fontSize: 12, fontWeight: 800,
        }}
      >
        {value}
      </span>
    </Link>
  );
}
