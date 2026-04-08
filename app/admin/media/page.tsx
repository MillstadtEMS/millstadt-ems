"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// ── Static slot definitions ────────────────────────────────────────────────

interface Slot {
  key: string;
  label: string;
  description: string;
  fallback: string;
  category: string;
}

const SLOTS: Slot[] = [
  // Homepage
  { key: "homepage.ambulance", label: "Homepage — Ambulance Feature", description: "Large ambulance image on the homepage feature section", fallback: "/images/millstadt-ems/ambo-56.png", category: "Homepage" },
  // About
  { key: "about.header", label: "About — Page Header", description: "Background for the About Us page header section", fallback: "/images/millstadt-ems/IMG_7771.jpeg", category: "About" },
  { key: "about.station", label: "About — Station Photo", description: "Station exterior or interior photo on the About page", fallback: "/images/millstadt-ems/IMG_3128.jpg", category: "About" },
  // Community
  { key: "community.header", label: "Community — Page Header", description: "Hero image for the Community Education page", fallback: "/images/millstadt-ems/community24.jpg", category: "Community" },
  // Donate
  { key: "donate.header", label: "Donate — Page Header", description: "Header image for the Donate page", fallback: "/images/millstadt-ems/IMG_0855.jpeg", category: "Donate" },
];

const CATEGORIES = [...new Set(SLOTS.map(s => s.category))];

// ── Component ──────────────────────────────────────────────────────────────

interface GalleryImage { id: string; url: string; altText: string; brightness: number; sortOrder: number; }

const inp = "w-full bg-[#040d1a] border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f0b429]/50 placeholder:text-slate-600 transition-colors";

export default function MediaAdmin() {
  const [namedUrls, setNamedUrls] = useState<Record<string, string>>({});
  const [heroImages, setHeroImages]   = useState<GalleryImage[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading]    = useState<string | null>(null); // key or collection
  const [preview, setPreview]        = useState<{ key: string; url: string } | null>(null);
  const [tab, setTab]                = useState<"slots" | "hero" | "gallery">("slots");
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<{ key?: string; collection?: string; brightness?: number } | null>(null);

  async function loadAll() {
    const [named, hero, gallery] = await Promise.all([
      fetch("/api/admin/media").then(r => r.json()),
      fetch("/api/admin/media?collection=hero").then(r => r.json()),
      fetch("/api/admin/media?collection=gallery").then(r => r.json()),
    ]);
    const map: Record<string, string> = {};
    if (Array.isArray(named)) named.forEach((n: { key: string; url: string }) => { map[n.key] = n.url; });
    setNamedUrls(map);
    if (Array.isArray(hero)) setHeroImages(hero);
    if (Array.isArray(gallery)) setGalleryImages(gallery);
  }

  useEffect(() => { loadAll(); }, []);

  function triggerUpload(target: { key?: string; collection?: string; brightness?: number }) {
    pendingUpload.current = target;
    fileRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingUpload.current) return;
    const target = pendingUpload.current;
    const key = target.key ?? target.collection ?? "unknown";
    setUploading(key);

    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/media/upload", { method: "POST", body: form });
    const { url } = await res.json();
    e.target.value = "";

    if (target.key) {
      setPreview({ key: target.key, url });
    } else if (target.collection) {
      await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection: target.collection, url, brightness: target.brightness ?? 0.45 }),
      });
      await loadAll();
    }
    setUploading(null);
    pendingUpload.current = null;
  }

  async function confirmSlot(key: string, url: string) {
    await fetch("/api/admin/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, url }),
    });
    setPreview(null);
    await loadAll();
  }

  async function clearSlot(key: string) {
    await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    await loadAll();
  }

  async function deleteGalleryImg(id: string) {
    await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadAll();
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">CMS</span>
        </div>
        <h1 className="text-3xl font-black text-white">Image Manager</h1>
        <p className="text-slate-400 text-sm mt-2">Upload, replace, and remove images across the site. Each slot is labeled by where it appears.</p>
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-[#071428] border border-white/10 p-1 rounded-xl w-fit">
        {([["slots", "Named Slots"], ["hero", "Hero Carousel"], ["gallery", "Photo Gallery"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === id ? "bg-[#f0b429] text-[#020810]" : "text-slate-400 hover:text-white"}`}>{label}</button>
        ))}
      </div>

      {/* ── Named Slots ── */}
      {tab === "slots" && (
        <div className="space-y-10">
          {CATEGORIES.map(cat => (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-5">
                <span className="h-px w-6 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">{cat}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {SLOTS.filter(s => s.category === cat).map(slot => {
                  const currentUrl = namedUrls[slot.key] || slot.fallback;
                  const isPending  = preview?.key === slot.key;
                  const isUploading = uploading === slot.key;
                  return (
                    <div key={slot.key} className="bg-[#071428] border border-white/10 rounded-2xl overflow-hidden">
                      {/* Image preview */}
                      <div className="relative h-44 bg-[#040d1a]">
                        <Image
                          src={isPending ? preview.url : currentUrl}
                          alt={slot.label}
                          fill
                          className="object-cover"
                          unoptimized={currentUrl.startsWith("https://")}
                        />
                        {namedUrls[slot.key] && !isPending && (
                          <div className="absolute top-2 right-2">
                            <span className="bg-[#f0b429] text-[#020810] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Custom</span>
                          </div>
                        )}
                        {isPending && (
                          <div className="absolute inset-0 bg-[#040d1a]/60 flex items-center justify-center">
                            <span className="text-[#f0b429] text-xs font-black uppercase tracking-widest">Preview — not saved</span>
                          </div>
                        )}
                      </div>
                      {/* Info + controls */}
                      <div className="p-5">
                        <div className="text-white font-bold text-sm mb-1">{slot.label}</div>
                        <div className="text-slate-500 text-xs leading-relaxed mb-4">{slot.description}</div>
                        {isPending ? (
                          <div className="flex gap-2">
                            <button onClick={() => confirmSlot(slot.key, preview.url)} className="flex-1 bg-[#f0b429] hover:bg-[#f5c842] text-[#020810] font-black px-4 py-2 rounded-lg text-sm transition-colors">Save & Update Site</button>
                            <button onClick={() => setPreview(null)} className="px-4 py-2 border border-white/10 text-slate-400 hover:text-white rounded-lg text-sm transition-colors">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => triggerUpload({ key: slot.key })}
                              disabled={isUploading}
                              className="flex-1 bg-[#f0b429]/10 hover:bg-[#f0b429]/20 border border-[#f0b429]/20 text-[#f0b429] font-bold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                              {isUploading ? "Uploading…" : namedUrls[slot.key] ? "Replace" : "Upload"}
                            </button>
                            {namedUrls[slot.key] && (
                              <button onClick={() => clearSlot(slot.key)} className="px-3 py-2 border border-white/10 text-slate-500 hover:text-red-400 hover:border-red-400/20 rounded-lg text-sm transition-colors">
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Hero Carousel ── */}
      {tab === "hero" && (
        <div>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            These images rotate on the homepage hero carousel. Upload new images to add them. The static set of 10 images is used as a fallback if no custom images are uploaded.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {heroImages.map(img => (
              <div key={img.id} className="relative group bg-[#071428] border border-white/10 rounded-xl overflow-hidden">
                <div className="relative h-36">
                  <Image src={img.url} alt="" fill className="object-cover" unoptimized />
                </div>
                <button
                  onClick={() => deleteGalleryImg(img.id)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
                <div className="px-3 py-2">
                  <label className="text-slate-500 text-xs">Brightness</label>
                  <span className="ml-2 text-white text-xs font-bold">{img.brightness}</span>
                </div>
              </div>
            ))}
            {/* Add new */}
            <button
              onClick={() => triggerUpload({ collection: "hero", brightness: 0.45 })}
              disabled={uploading === "hero"}
              className="h-36 bg-[#071428] border-2 border-dashed border-white/10 hover:border-[#f0b429]/30 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-[#f0b429] transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              <span className="text-sm font-bold">{uploading === "hero" ? "Uploading…" : "Add Image"}</span>
            </button>
          </div>
          {heroImages.length > 0 && (
            <p className="text-slate-600 text-xs">Changes take effect on next page load. Custom hero images replace the static set entirely.</p>
          )}
        </div>
      )}

      {/* ── Gallery ── */}
      {tab === "gallery" && (
        <div>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            These photos appear in the Photo Gallery page. Upload multiple images to add them to the grid.
          </p>
          <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
            {galleryImages.map(img => (
              <div key={img.id} className="relative group bg-[#071428] border border-white/10 rounded-xl overflow-hidden">
                <div className="relative h-28">
                  <Image src={img.url} alt={img.altText || ""} fill className="object-cover" unoptimized />
                </div>
                <button
                  onClick={() => deleteGalleryImg(img.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            ))}
            <button
              onClick={() => triggerUpload({ collection: "gallery" })}
              disabled={uploading === "gallery"}
              className="h-28 bg-[#071428] border-2 border-dashed border-white/10 hover:border-[#f0b429]/30 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-[#f0b429] transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              <span className="text-xs font-bold">{uploading === "gallery" ? "Uploading…" : "Add Photo"}</span>
            </button>
          </div>
          <p className="text-slate-500 text-xs">
            {galleryImages.length > 0
              ? `${galleryImages.length} custom photos — these replace the static gallery.`
              : "No custom photos yet. Static gallery images are used as fallback."}
          </p>
        </div>
      )}
    </div>
  );
}
