"use client";

import { useEffect, useState } from "react";

interface Testimonial {
  id: string; name: string; role: string; quote: string;
  rating: number; approved: boolean; createdAt: string;
}

const blank = { name: "", role: "", quote: "", rating: 5, approved: true };

const inp  = "w-full bg-[#040d1a] border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f0b429]/50 placeholder:text-slate-600 transition-colors";
const lbl  = "block text-slate-300 text-sm font-semibold mb-2";

export default function TestimonialsAdmin() {
  const [items, setItems]     = useState<Testimonial[]>([]);
  const [form, setForm]       = useState(blank);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/admin/testimonials");
    setItems(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name || !form.quote) return;
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2"><span className="h-px w-8 bg-[#f0b429]" /><span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">CMS</span></div>
        <h1 className="text-3xl font-black text-white">Testimonials</h1>
        <p className="text-slate-400 text-sm mt-1.5">Manage community feedback shown on the public site.</p>
      </div>

      {/* Add form */}
      <div className="bg-[#071428] border border-white/10 rounded-2xl p-7 mb-8">
        <h2 className="text-white font-black text-lg mb-6">Add Testimonial</h2>
        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={lbl}>Name</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className={inp} placeholder="Jane Smith" />
          </div>
          <div>
            <label className={lbl}>Role / Title <span className="text-slate-600 font-normal normal-case text-xs">(optional)</span></label>
            <input value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} className={inp} placeholder="Millstadt Resident" />
          </div>
        </div>
        <div className="mb-5">
          <label className={lbl}>Quote</label>
          <textarea value={form.quote} onChange={e => setForm(f => ({...f, quote: e.target.value}))} rows={4} className={`${inp} resize-none`} placeholder="The crew arrived quickly and were incredibly professional…" />
        </div>
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className={lbl}>Rating</label>
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setForm(f => ({...f, rating: n}))} className={`text-2xl transition-colors ${n <= form.rating ? "text-[#f0b429]" : "text-slate-700 hover:text-slate-500"}`}>★</button>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={saving || !form.name || !form.quote} className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-black px-7 py-3 rounded-xl text-sm transition-colors">
            {saving ? "Saving…" : "Add Testimonial"}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-slate-500 text-sm py-10 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-12 text-center text-slate-500 text-sm">No testimonials yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map(t => (
            <div key={t.id} className={`bg-[#071428] border rounded-2xl p-6 flex gap-5 items-start transition-opacity ${t.approved ? "border-white/10" : "border-white/5 opacity-50"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="text-white font-bold">{t.name}</span>
                  {t.role && <span className="text-slate-500 text-sm">{t.role}</span>}
                  <span className="text-[#f0b429]">{"★".repeat(t.rating)}<span className="text-slate-700">{"★".repeat(5 - t.rating)}</span></span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">"{t.quote}"</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle(t)} className={`text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${
                  t.approved
                    ? "border-emerald-500/30 text-emerald-400 hover:border-slate-500/30 hover:text-slate-400"
                    : "border-white/10 text-slate-500 hover:border-emerald-400/30 hover:text-emerald-400"
                }`}>
                  {t.approved ? "Live" : "Hidden"}
                </button>
                <button onClick={() => del(t.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/5">
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
