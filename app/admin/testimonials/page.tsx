"use client";

import { useEffect, useState } from "react";

interface Testimonial {
  id: string; name: string; role: string; quote: string;
  rating: number; approved: boolean; createdAt: string;
}

const blank = { name: "", role: "", quote: "", rating: 5, approved: true };

export default function TestimonialsAdmin() {
  const [items, setItems]   = useState<Testimonial[]>([]);
  const [form, setForm]     = useState(blank);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/admin/testimonials");
    setItems(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/admin/testimonials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm(blank); await load(); setSaving(false);
  }

  async function toggle(t: Testimonial) {
    await fetch("/api/admin/testimonials", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, approved: !t.approved }) });
    await load();
  }

  async function del(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    await fetch("/api/admin/testimonials", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8"><h1 className="text-2xl font-black text-white">Testimonials</h1><p className="text-slate-500 text-sm mt-1">Manage community feedback shown on the site.</p></div>

      {/* Form */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-8">
        <h2 className="text-white font-bold mb-5 text-sm uppercase tracking-widest">Add Testimonial</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm" placeholder="Jane Smith" />
          </div>
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Role / Title <span className="text-slate-700 normal-case font-normal">(optional)</span></label>
            <input value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm" placeholder="Millstadt Resident" />
          </div>
        </div>
        <div className="mb-4">
          <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Quote</label>
          <textarea value={form.quote} onChange={e => setForm(f => ({...f, quote: e.target.value}))} rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm resize-none" placeholder="The crew arrived quickly and were incredibly professional…" />
        </div>
        <div className="flex gap-4 flex-wrap items-end">
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Rating</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setForm(f => ({...f, rating: n}))} className={`text-xl transition-colors ${n <= form.rating ? "text-[#f0b429]" : "text-slate-700"}`}>★</button>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={saving || !form.name || !form.quote} className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-black px-6 py-2.5 rounded-lg text-sm transition-colors">
            {saving ? "Saving…" : "Add Testimonial"}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? <div className="text-slate-600 text-sm">Loading…</div> : items.length === 0 ? (
        <div className="text-center py-16 text-slate-600">No testimonials yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map(t => (
            <div key={t.id} className={`border rounded-xl p-5 flex gap-4 items-start ${t.approved ? "bg-white/3 border-white/8" : "bg-white/1 border-white/4 opacity-50"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-bold text-sm">{t.name}</span>
                  {t.role && <span className="text-slate-500 text-xs">{t.role}</span>}
                  <span className="text-[#f0b429] text-sm">{"★".repeat(t.rating)}</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">"{t.quote}"</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle(t)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${t.approved ? "border-emerald-500/30 text-emerald-400 hover:bg-slate-400/10 hover:text-slate-400 hover:border-slate-400/30" : "border-white/10 text-slate-500 hover:bg-emerald-400/10 hover:text-emerald-400 hover:border-emerald-400/30"}`}>
                  {t.approved ? "Hide" : "Show"}
                </button>
                <button onClick={() => del(t.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
