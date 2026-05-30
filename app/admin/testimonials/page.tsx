"use client";

import { useEffect, useState } from "react";

interface Testimonial {
  id: string;
  name: string | null;
  anonymous: boolean;
  message: string;
  status: "pending" | "approved" | "denied";
  submittedAt: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function displayName(t: Testimonial): string {
  if (t.anonymous) return "Anonymous";
  return t.name?.trim() || "Anonymous";
}

export default function TestimonialsAdmin() {
  const [items, setItems]     = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/admin/testimonials");
    setItems(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function setStatusFor(id: string, status: "approved" | "denied") {
    await fetch("/api/admin/testimonials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  async function del(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    await fetch("/api/admin/testimonials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
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

      {loading ? (
        <div className="text-slate-500 text-sm py-10 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-12 text-center text-slate-500 text-sm">No testimonials yet.</div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <Section title={`${pending.length} Pending Review`} accent="gold">
              {pending.map(t => <TestimonialRow key={t.id} t={t} onSetStatus={setStatusFor} onDelete={del} />)}
            </Section>
          )}
          {approved.length > 0 && (
            <Section title={`${approved.length} Live`} accent="muted">
              {approved.map(t => <TestimonialRow key={t.id} t={t} onSetStatus={setStatusFor} onDelete={del} />)}
            </Section>
          )}
          {denied.length > 0 && (
            <Section title={`${denied.length} Denied`} accent="muted">
              {denied.map(t => <TestimonialRow key={t.id} t={t} onSetStatus={setStatusFor} onDelete={del} />)}
            </Section>
          )}
        </div>
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

function TestimonialRow({ t, onSetStatus, onDelete }: {
  t: Testimonial;
  onSetStatus: (id: string, status: "approved" | "denied") => void;
  onDelete: (id: string) => void;
}) {
  const borderClass =
    t.status === "approved" ? "border-emerald-500/20"
    : t.status === "denied"   ? "border-red-500/20"
    : "border-[#f0b429]/20";

  return (
    <div className={`bg-[#071428] border rounded-2xl p-6 flex gap-5 items-start ${borderClass}`}>
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
          <button onClick={() => onSetStatus(t.id, "approved")} className="text-xs font-bold px-3 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-400/5 transition-colors">
            Approve
          </button>
        )}
        {t.status !== "denied" && (
          <button onClick={() => onSetStatus(t.id, "denied")} className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-600/30 text-slate-400 hover:text-red-300 transition-colors">
            Deny
          </button>
        )}
        <button onClick={() => onDelete(t.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/5" aria-label="Delete">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
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
