"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

interface Testimonial {
  id: string;
  name: string | null;
  anonymous: boolean;
  message: string;
  status: "pending" | "approved" | "denied";
  submittedAt: string;
  moderatedBy: string | null;
  moderatedAt: string | null;
}

interface ModerationAudit {
  id: string;
  testimonialId: string;
  action: "approve" | "deny" | "delete";
  previousStatus: Testimonial["status"] | null;
  nextStatus: Testimonial["status"] | null;
  actorName: string;
  name: string | null;
  anonymous: boolean;
  createdAt: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function displayName(t: Testimonial): string {
  if (t.anonymous) return "Anonymous";
  return t.name?.trim() || "Anonymous";
}

export default function TestimonialsAdmin() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [audit, setAudit] = useState<ModerationAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [legacyLink, setLegacyLink] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/testimonials?includeAudit=1", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data: unknown = await response.json();
      if (!response.ok || !data || typeof data !== "object") {
        throw new Error("Could not load testimonials.");
      }
      const parsed = data as { items?: unknown; audit?: unknown };
      setItems(Array.isArray(parsed.items) ? parsed.items as Testimonial[] : []);
      setAudit(Array.isArray(parsed.audit) ? parsed.audit as ModerationAudit[] : []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load testimonials.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReviewId(params.get("review"));
    setLegacyLink(params.get("legacy") === "1");
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading && reviewId) {
      document.getElementById(`testimonial-${reviewId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [loading, reviewId]);

  async function setStatusFor(id: string, status: "approved" | "denied") {
    const actionKey = `${id}:${status}`;
    if (busy) return;
    setBusy(actionKey);
    setError(null);
    try {
      const response = await fetch("/api/admin/testimonials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not update this testimonial.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not update this testimonial.");
    } finally {
      setBusy(null);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    if (busy) return;
    setBusy(`${id}:delete`);
    setError(null);
    try {
      const response = await fetch("/api/admin/testimonials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not delete this testimonial.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not delete this testimonial.");
    } finally {
      setBusy(null);
    }
  }

  const pending  = items.filter(t => t.status === "pending");
  const approved = items.filter(t => t.status === "approved");
  const denied   = items.filter(t => t.status === "denied");

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2"><span className="h-px w-8 bg-[#f0b429]" /><span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">CMS</span></div>
        <h1 className="text-3xl font-black text-white">Testimonials</h1>
        <p className="text-slate-400 text-sm mt-1.5">Approve or deny testimonials submitted by the public.</p>
      </div>

      {legacyLink && (
        <div className="mb-5 border border-[#f0b429]/30 bg-[#f0b429]/10 px-4 py-3 text-sm text-slate-200">
          The email link opened this protected review page. No testimonial was changed automatically.
        </div>
      )}

      {error && (
        <div role="alert" className="mb-5 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm py-10 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-12 text-center text-slate-500 text-sm">No testimonials yet.</div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <Section title={`${pending.length} Pending Review`} accent="gold">
              {pending.map(t => <TestimonialRow key={t.id} t={t} busy={busy} focused={reviewId === t.id} onSetStatus={setStatusFor} onDelete={del} />)}
            </Section>
          )}
          {approved.length > 0 && (
            <Section title={`${approved.length} Live`} accent="muted">
              {approved.map(t => <TestimonialRow key={t.id} t={t} busy={busy} focused={reviewId === t.id} onSetStatus={setStatusFor} onDelete={del} />)}
            </Section>
          )}
          {denied.length > 0 && (
            <Section title={`${denied.length} Denied`} accent="muted">
              {denied.map(t => <TestimonialRow key={t.id} t={t} busy={busy} focused={reviewId === t.id} onSetStatus={setStatusFor} onDelete={del} />)}
            </Section>
          )}
        </div>
      )}

      {audit.length > 0 && (
        <details className="mt-10 border-t border-white/10 pt-5">
          <summary className="cursor-pointer text-sm font-bold text-slate-300">Moderation history</summary>
          <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {audit.map((entry) => (
              <div key={entry.id} className="grid gap-1 py-3 text-xs text-slate-400 sm:grid-cols-[150px_1fr_auto] sm:items-center sm:gap-4">
                <span className="font-bold uppercase text-slate-300">{entry.action}</span>
                <span>{entry.anonymous ? "Anonymous" : (entry.name || "Anonymous")} by {entry.actorName}</span>
                <time dateTime={entry.createdAt}>{fmtDateTime(entry.createdAt)}</time>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: "gold" | "muted"; children: React.ReactNode }) {
  const dot   = accent === "gold" ? "bg-[#f0b429]" : "bg-slate-700";
  const label = accent === "gold" ? "text-[#f0b429] text-sm font-black uppercase tracking-widest" : "text-slate-500 text-xs font-semibold uppercase tracking-widest";
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        {accent === "gold" ? <span className={`w-2 h-2 rounded-full ${dot}`} /> : <span className={`h-px w-6 ${dot}`} />}
        <span className={label}>{title}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TestimonialRow({ t, busy, focused, onSetStatus, onDelete }: {
  t: Testimonial;
  busy: string | null;
  focused: boolean;
  onSetStatus: (id: string, status: "approved" | "denied") => void;
  onDelete: (id: string) => void;
}) {
  const borderClass =
    t.status === "approved" ? "border-emerald-500/20"
    : t.status === "denied"   ? "border-red-500/20"
    : "border-[#f0b429]/20";

  return (
    <div
      id={`testimonial-${t.id}`}
      className={`bg-[#071428] border rounded-2xl p-6 flex gap-5 items-start ${focused ? "ring-2 ring-[#f0b429]" : ""} ${borderClass}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
          <span className="text-white font-bold">{displayName(t)}</span>
          {t.anonymous && <span className="text-slate-500 text-xs uppercase tracking-wider">Anonymous</span>}
          <StatusPill status={t.status} />
          <span className="text-slate-600 text-xs ml-auto">{fmtDate(t.submittedAt)}</span>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">&ldquo;{t.message}&rdquo;</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {t.status !== "approved" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onSetStatus(t.id, "approved")}
            className="text-xs font-bold px-3 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-400/5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === `${t.id}:approved` ? "Saving" : "Approve"}
          </button>
        )}
        {t.status !== "denied" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onSetStatus(t.id, "denied")}
            className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-600/30 text-slate-400 hover:text-red-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === `${t.id}:denied` ? "Saving" : "Deny"}
          </button>
        )}
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => onDelete(t.id)}
          className="text-slate-600 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/5 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={busy === `${t.id}:delete` ? "Deleting testimonial" : "Delete testimonial"}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Testimonial["status"] }) {
  const styles =
    status === "approved" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : status === "denied"   ? "bg-red-500/15 text-red-300 border-red-500/30"
    : "bg-[#f0b429]/15 text-[#f0b429] border-[#f0b429]/30";
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles}`}>
      {status}
    </span>
  );
}
