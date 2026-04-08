"use client";

import { useEffect, useState } from "react";

interface Testimonial {
  id: string; name: string; role: string; quote: string;
  rating: number; approved: boolean; createdAt: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TestimonialsAdmin() {
  const [items, setItems]     = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/admin/testimonials");
    setItems(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggle(t: Testimonial) {
    await fetch("/api/admin/testimonials", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, approved: !t.approved }) });
    await load();
  }

  async function del(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    await fetch("/api/admin/testimonials", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  const pending  = items.filter(t => !t.approved);
  const approved = items.filter(t =>  t.approved);

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
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#f0b429]" />
                <span className="text-[#f0b429] text-sm font-black uppercase tracking-widest">{pending.length} Pending Review</span>
              </div>
              <div className="space-y-3">
                {pending.map(t => <TestimonialRow key={t.id} t={t} onToggle={toggle} onDelete={del} fmtDate={fmtDate} />)}
              </div>
            </div>
          )}
          {approved.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px w-6 bg-slate-700" />
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{approved.length} Live</span>
              </div>
              <div className="space-y-3">
                {approved.map(t => <TestimonialRow key={t.id} t={t} onToggle={toggle} onDelete={del} fmtDate={fmtDate} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TestimonialRow({ t, onToggle, onDelete, fmtDate }: {
  t: Testimonial;
  onToggle: (t: Testimonial) => void;
  onDelete: (id: string) => void;
  fmtDate: (iso: string) => string;
}) {
  return (
    <div className={`bg-[#071428] border rounded-2xl p-6 flex gap-5 items-start transition-opacity ${t.approved ? "border-white/10" : "border-[#f0b429]/20"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
          <span className="text-white font-bold">{t.name}</span>
          {t.role && <span className="text-slate-500 text-sm">{t.role}</span>}
          <span className="text-[#f0b429]">{"★".repeat(t.rating)}<span className="text-slate-700">{"★".repeat(5 - t.rating)}</span></span>
          <span className="text-slate-600 text-xs ml-auto">{fmtDate(t.createdAt)}</span>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">"{t.quote}"</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => onToggle(t)} className={`text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${
          t.approved
            ? "border-emerald-500/30 text-emerald-400 hover:border-slate-500/30 hover:text-slate-400"
            : "border-[#f0b429]/30 text-[#f0b429] hover:border-emerald-400/30 hover:text-emerald-400"
        }`}>
          {t.approved ? "Live" : "Approve"}
        </button>
        <button onClick={() => onDelete(t.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
    </div>
  );
}
